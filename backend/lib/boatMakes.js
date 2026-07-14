import { slugify, uniqueRegionSlug } from './slug.js';

/**
 * Ensure boat make slug is unique within a search.
 */
export async function uniqueBoatMakeSlug(prismaClient, searchId, baseSlug, excludeId = null) {
  let slug = baseSlug || 'make';
  let counter = 2;

  while (true) {
    const existing = await prismaClient.boatMake.findUnique({
      where: { searchId_slug: { searchId, slug } },
    });
    if (!existing || existing.id === excludeId) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

/**
 * Ensure boat model slug is unique under a make.
 */
export async function uniqueBoatModelSlug(prismaClient, makeId, baseSlug, excludeId = null) {
  let slug = baseSlug || 'model';
  let counter = 2;

  while (true) {
    const existing = await prismaClient.boatModel.findUnique({
      where: { makeId_slug: { makeId, slug } },
    });
    if (!existing || existing.id === excludeId) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

function normalizeName(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

/**
 * Find or create BoatMake / BoatModel for a search from free-text make/model.
 * Returns FK ids (null when the corresponding name is empty).
 */
export async function ensureBoatMakeAndModel(prismaClient, searchId, makeName, modelName) {
  const make = normalizeName(makeName);
  const model = normalizeName(modelName);

  if (!make) {
    return { boatMakeId: null, boatModelId: null };
  }

  const makes = await prismaClient.boatMake.findMany({
    where: { searchId },
    select: { id: true, name: true },
  });
  let boatMake = makes.find((row) => row.name.toLowerCase() === make.toLowerCase()) || null;

  if (!boatMake) {
    const slug = await uniqueBoatMakeSlug(prismaClient, searchId, slugify(make));
    boatMake = await prismaClient.boatMake.create({
      data: {
        searchId,
        name: make,
        slug,
      },
      select: { id: true, name: true },
    });
  }

  if (!model) {
    return { boatMakeId: boatMake.id, boatModelId: null };
  }

  const models = await prismaClient.boatModel.findMany({
    where: { makeId: boatMake.id },
    select: { id: true, name: true },
  });
  let boatModel = models.find((row) => row.name.toLowerCase() === model.toLowerCase()) || null;

  if (!boatModel) {
    const slug = await uniqueBoatModelSlug(prismaClient, boatMake.id, slugify(model));
    boatModel = await prismaClient.boatModel.create({
      data: {
        makeId: boatMake.id,
        name: model,
        slug,
      },
      select: { id: true, name: true },
    });
  }

  return { boatMakeId: boatMake.id, boatModelId: boatModel.id };
}

// Re-export for callers that already import uniqueRegionSlug alongside.
export { slugify, uniqueRegionSlug };
