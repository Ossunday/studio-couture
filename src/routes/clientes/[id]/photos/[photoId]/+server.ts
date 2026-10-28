import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clePhotoDepuisEnv, dechiffrer } from '$lib/server/crypto';
import { exigerConnexion } from '$lib/server/garde';
import { getRepository } from '$lib/server/repository';

/** Lecture d’une photo cliente déchiffrée en mémoire — jamais d’URL publique, jamais de cache. */
export const GET: RequestHandler = async ({ locals, params }) => {
  const u = exigerConnexion(locals.utilisatrice);
  const repo = getRepository();
  const cliente = await repo.trouverCliente(u.atelierId, params.id);
  if (!cliente) throw error(404, 'Cliente introuvable.');
  const photo = await repo.trouverPhoto(cliente.id, params.photoId);
  if (!photo || photo.expireLe.getTime() <= Date.now()) throw error(404, 'Photo introuvable ou expirée.');
  const clair = dechiffrer(
    { iv: photo.iv, authTag: photo.authTag, donnees: photo.donneesChiffrees },
    clePhotoDepuisEnv()
  );
  return new Response(new Uint8Array(clair), {
    headers: {
      'content-type': photo.typeMime,
      'cache-control': 'private, no-store',
      'content-disposition': 'inline'
    }
  });
};
