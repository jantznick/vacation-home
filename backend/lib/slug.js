/**
 * Generate a URL-safe slug from a name.
 */
export function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Ensure region slug is unique within a search by appending -2, -3, etc.
 */
export async function uniqueRegionSlug(prismaClient, searchId, baseSlug, excludeId = null) {
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await prismaClient.region.findUnique({
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
 * Ensure search slug is globally unique.
 */
export async function uniqueSearchSlug(prismaClient, baseSlug, excludeId = null) {
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await prismaClient.search.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

/**
 * Ensure marina slug is unique within a search by appending -2, -3, etc.
 */
export async function uniqueMarinaSlug(prismaClient, searchId, baseSlug, excludeId = null) {
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await prismaClient.marina.findUnique({
      where: { searchId_slug: { searchId, slug } },
    });
    if (!existing || existing.id === excludeId) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

/** @deprecated use uniqueRegionSlug */
export async function uniqueSlug(prismaClient, baseSlug, excludeId = null) {
  return uniqueRegionSlug(prismaClient, null, baseSlug, excludeId);
}
