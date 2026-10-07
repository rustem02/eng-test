import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { Round } from '../models/round.model';
import { Score } from '../models/score.model';
import { User } from '../models/user.model';

export type RoundLifecycleStatus = 'Cooldown' | 'Active' | 'Finished';

@Injectable()
export class GamesService {
  constructor(
    @InjectConnection()
    private readonly sequelize: Sequelize,
    @InjectModel(Round)
    private roundModel: typeof Round,
    @InjectModel(Score)
    private scoreModel: typeof Score,
    @InjectModel(User)
    private userModel: typeof User,
  ) {}

  getRoundStatus(round: Round, now: Date = new Date()): RoundLifecycleStatus {
    if (now < new Date(round.start_datetime)) {
      return 'Cooldown';
    }
    if (now > new Date(round.end_datetime)) {
      return 'Finished';
    }
    return 'Active';
  }

  withComputedStatus(round: Round, now: Date = new Date()): Round {
    const plain = round.toJSON() as Round;
    return {
      ...plain,
      status: this.getRoundStatus(round, now),
    } as Round;
  }

  async getAllRounds(): Promise<Round[]> {
    const now = new Date();
    const rounds = await this.roundModel.findAll({
      where: {
        end_datetime: { [Op.gt]: now },
      },
      order: [['start_datetime', 'ASC']],
    });
    return rounds.map((round) => this.withComputedStatus(round, now));
  }

  async getRoundByUuid(uuid: string): Promise<Round | null> {
    return this.roundModel.findByPk(uuid);
  }

  async getOrCreateScoreByUserAndRound(
    userId: string,
    roundUuid: string,
    transaction?: Transaction,
  ): Promise<Score> {
    const [scoreRecord] = await this.scoreModel.findOrCreate({
      where: {
        user: userId,
        round: roundUuid,
      },
      defaults: {
        user: userId,
        round: roundUuid,
        taps: 0,
      },
      transaction,
    });
    return scoreRecord;
  }

  async createRound(): Promise<Round> {
    const now = new Date();
    const cooldownDuration =
      parseInt(process.env.COOLDOWN_DURATION || '30', 10) * 1000;
    const roundDuration =
      parseInt(process.env.ROUND_DURATION || '60', 10) * 1000;

    const startDatetime = new Date(now.getTime() + cooldownDuration);
    const endDatetime = new Date(
      now.getTime() + cooldownDuration + roundDuration,
    );

    const round = await this.roundModel.create({
      uuid: uuidv4(),
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      status: 'Cooldown',
      total_score: 0,
    });

    return this.withComputedStatus(round, now);
  }

  /** 1 tap = 1 point; every 11th tap is worth 10 points (= +9 bonus). */
  scoreFromTapsCount(taps: number): number {
    return Math.floor(taps / 11) * 9 + taps;
  }

  pointsForTapNumber(tapsAfterIncrement: number): number {
    return tapsAfterIncrement % 11 === 0 ? 10 : 1;
  }

  async processTap(
    userId: string,
    roundUuid: string,
    role: string,
  ): Promise<{ score: number }> {
    return this.sequelize.transaction(async (transaction) => {
      const round = await this.roundModel.findByPk(roundUuid, {
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });

      if (!round) {
        throw new NotFoundException('Round not found');
      }

      const now = new Date();
      if (this.getRoundStatus(round, now) !== 'Active') {
        throw new BadRequestException('Round is not active');
      }

      await this.getOrCreateScoreByUserAndRound(userId, roundUuid, transaction);

      if (role === 'nikita') {
        return { score: 0 };
      }

      // Atomic increment in DB — safe across multiple backend instances
      const [updatedRows] = (await this.sequelize.query(
        `UPDATE scores
         SET taps = taps + 1
         WHERE "user" = :userId AND round = :roundUuid
         RETURNING taps`,
        {
          replacements: { userId, roundUuid },
          transaction,
        },
      )) as [Array<{ taps: number }>, unknown];

      const taps = updatedRows[0]?.taps;
      if (taps === undefined) {
        throw new BadRequestException('Failed to update score');
      }

      const pointsAdded = this.pointsForTapNumber(taps);
      await round.increment('total_score', {
        by: pointsAdded,
        transaction,
      });

      return { score: this.scoreFromTapsCount(taps) };
    });
  }

  async getRoundSummary(roundUuid: string): Promise<{
    totalScore: number;
    bestPlayer: { username: string; score: number } | null;
  }> {
    const round = await this.roundModel.findByPk(roundUuid);
    const scores = await this.scoreModel.findAll({
      where: {
        round: roundUuid,
      },
      include: [
        {
          model: this.userModel,
          as: 'userRef',
          attributes: ['login', 'role'],
        },
      ],
    });

    const eligible = scores.filter(
      (score) => score.userRef?.role !== 'nikita',
    );

    const totalFromPlayers = eligible.reduce(
      (sum, score) => sum + this.scoreFromTapsCount(score.taps),
      0,
    );
    const totalScore =
      round?.total_score !== undefined && round.total_score !== null
        ? round.total_score
        : totalFromPlayers;

    let bestPlayer: { username: string; score: number } | null = null;
    if (eligible.length > 0) {
      const bestScore = eligible.reduce((max, score) => {
        const scorePoints = this.scoreFromTapsCount(score.taps);
        const maxPoints = this.scoreFromTapsCount(max.taps);
        return scorePoints > maxPoints ? score : max;
      });

      bestPlayer = {
        username: bestScore.userRef.login,
        score: this.scoreFromTapsCount(bestScore.taps),
      };
    }

    return {
      totalScore,
      bestPlayer,
    };
  }

  isRoundFinished(round: Round): boolean {
    return this.getRoundStatus(round) === 'Finished';
  }
}
