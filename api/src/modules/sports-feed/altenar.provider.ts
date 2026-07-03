// api/src/modules/sports-feed/altenar.provider.ts
import { BadGatewayException, Injectable } from '@nestjs/common';
import { NormalizedEvent, SportsFeedProvider } from './sports-feed.types';
import { AltenarRaw, normalizeAltenar } from './altenar.normalize';

const SOCCER_SPORT_ID = 66;

/**
 * Reads the public Altenar widget feed the Esportiva site itself consumes.
 * Unofficial and best-effort: everything is env-configurable so this whole
 * class is replaced by an official provider without touching callers.
 */
@Injectable()
export class AltenarFeedProvider implements SportsFeedProvider {
  readonly name = 'altenar';

  private base(): string {
    return (
      process.env.ALTENAR_BASE_URL ??
      'https://sb2frontend-altenar2.biahosted.com/api/Widget'
    );
  }

  private integration(): string {
    return process.env.ALTENAR_INTEGRATION ?? 'esportiva';
  }

  /** {id} is replaced by the Altenar event id. Provisional path — swap via env. */
  private deepLinkTemplate(): string {
    return (
      process.env.ESPORTIVA_EVENT_URL_TEMPLATE ??
      'https://esportiva.bet.br/sports/?bt-path=%2Fevent%2F{id}'
    );
  }

  private deepLink = (eventId: number): string =>
    this.deepLinkTemplate().replace('{id}', String(eventId));

  async fetchUpcoming(): Promise<NormalizedEvent[]> {
    const params = new URLSearchParams({
      culture: 'pt-BR',
      timezoneOffset: '180',
      integration: this.integration(),
      deviceType: '1',
      numFormat: 'en-GB',
      countryCode: 'BR',
      sportId: String(SOCCER_SPORT_ID),
      period: '0',
      categoryIds: '',
      championshipIds: '',
    });

    let raw: AltenarRaw;
    try {
      const res = await fetch(`${this.base()}/GetEvents?${params.toString()}`, {
        headers: { Referer: 'https://esportiva.bet.br/' },
      });
      if (!res.ok) {
        throw new BadGatewayException(`Altenar feed returned ${res.status}`);
      }
      raw = (await res.json()) as AltenarRaw;
    } catch (err) {
      if (err instanceof BadGatewayException) throw err;
      throw new BadGatewayException('Could not reach the sportsbook feed');
    }

    return normalizeAltenar(raw, this.deepLink);
  }
}
