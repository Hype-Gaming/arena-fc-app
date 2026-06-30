import {
  Controller,
  Get,
  Post,
  Param,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TipsService } from './tips.service';
import {
  EntradaNotFoundError,
  CategoryNotFoundError,
  MatchNotFoundError,
} from './tips.errors';

interface AuthUser {
  id: string;
  role: string;
}

@Controller('tips')
@UseGuards(JwtAuthGuard)
export class TipsController {
  constructor(private readonly tips: TipsService) {}

  @Get('feed')
  getFeed(@CurrentUser() user: AuthUser) {
    return this.tips.getFeed(user.id);
  }

  @Post('entradas/:id/unlock')
  async unlock(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    try {
      return await this.tips.unlockEntrada(user.id, id);
    } catch (err) {
      if (err instanceof EntradaNotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Get('categories')
  listCategories() {
    return this.tips.listCategories();
  }

  @Get('categories/:id/matches')
  async matchesByCategory(@Param('id') id: string) {
    try {
      return await this.tips.listMatchesByCategory(id);
    } catch (err) {
      if (err instanceof CategoryNotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Get('matches/:id')
  async getMatch(@Param('id') id: string) {
    try {
      return await this.tips.getMatch(id);
    } catch (err) {
      if (err instanceof MatchNotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }
}
