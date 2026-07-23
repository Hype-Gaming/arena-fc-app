import { BadRequestException } from '@nestjs/common';
import { buildEsportivaSelectionsUrl } from '../sports-feed/esportiva-link';
import { CreateBilheteDto } from './dto/bilhete.dto';

/**
 * Accept either a server-shared coupon (`esportiva.bet.br?shareCode=…`) or an
 * affiliate pre-fill link (`go.aff.esportiva.bet?selections=…`). Anything else
 * — or non-HTTPS — is rejected. Returns the normalized URL string.
 */
export function validateEsportivaShareUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BadRequestException('Invalid Esportiva share URL');
  }
  if (url.protocol !== 'https:') {
    throw new BadRequestException('Esportiva share URL must be HTTPS');
  }
  const isShare =
    url.hostname === 'esportiva.bet.br' && !!url.searchParams.get('shareCode');
  const isSelections =
    url.hostname === 'go.aff.esportiva.bet' &&
    !!url.searchParams.get('selections');
  if (!isShare && !isSelections) {
    throw new BadRequestException(
      'Esportiva URL must include shareCode or selections',
    );
  }
  return url.toString();
}

/**
 * Turn a create-DTO into the pre-filled deep-link, or null when it lacks the
 * sportsbook ids. Múltipla: every leg must carry `eventExternalId` + `oddId`.
 * Simples: the top-level `eventExternalId` + `oddId`.
 */
export function buildBilheteShareUrl(
  dto: Pick<CreateBilheteDto, 'legs' | 'eventExternalId' | 'oddId'>,
): string | null {
  if (dto.legs && dto.legs.length > 0) {
    const pairs = dto.legs
      .filter((l) => !!l.eventExternalId && l.oddId != null)
      .map((l) => ({ eventId: l.eventExternalId!, oddId: l.oddId! }));
    if (pairs.length !== dto.legs.length) return null;
    return buildEsportivaSelectionsUrl(pairs);
  }
  if (dto.eventExternalId && dto.oddId != null) {
    return buildEsportivaSelectionsUrl([
      { eventId: dto.eventExternalId, oddId: dto.oddId },
    ]);
  }
  return null;
}
