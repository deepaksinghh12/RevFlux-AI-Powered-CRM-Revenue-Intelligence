import Organization from "../models/Organization.js";

/**
 * Generate a clean, unique organization code (2-10 uppercase alphanumeric chars)
 * @param {string} name - Organization name
 * @param {ObjectId} [excludeOrgId] - Optional org ID to exclude from uniqueness check
 * @returns {Promise<string>}
 */
export async function generateUniqueOrgCode(name, excludeOrgId = null) {
  const clean = (name || "ORG")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  let base = clean.slice(0, 4);
  if (base.length < 2) {
    base = (base + "ORG").slice(0, 4);
  }

  let candidate = base;
  let counter = 1;

  while (true) {
    const query = { code: candidate };
    if (excludeOrgId) {
      query._id = { $ne: excludeOrgId };
    }
    const exists = await Organization.exists(query);
    if (!exists) {
      return candidate;
    }

    const suffix = String(counter++);
    const allowedBaseLength = Math.max(2, 10 - suffix.length);
    candidate = `${base.slice(0, allowedBaseLength)}${suffix}`;
  }
}

/**
 * Atomically allocate the next sequential member ID for an organization
 * @param {string|ObjectId} orgId
 * @returns {Promise<{ memberSeq: number, memberId: string, orgCode: string }>}
 */
export async function allocateMemberId(orgId) {
  let org = await Organization.findById(orgId);
  if (!org) {
    throw new Error(`Organization ${orgId} not found`);
  }

  // Ensure organization has a code
  if (!org.code) {
    org.code = await generateUniqueOrgCode(org.name, org._id);
    if (!org.nextMemberSeq || org.nextMemberSeq < 1) {
      org.nextMemberSeq = 1;
    }
    await org.save();
  }

  // Atomically increment the sequence counter
  const updatedOrg = await Organization.findByIdAndUpdate(
    orgId,
    { $inc: { nextMemberSeq: 1 } },
    { new: true, upsert: false }
  );

  const allocatedSeq = (updatedOrg.nextMemberSeq || 2) - 1;
  const memberId = formatMemberId(updatedOrg.code, allocatedSeq);

  return {
    memberSeq: allocatedSeq,
    memberId,
    orgCode: updatedOrg.code,
  };
}

/**
 * Format a Member ID from org code and sequential number
 * e.g. META + 24 -> META-024
 * @param {string} code
 * @param {number} seq
 * @returns {string}
 */
export function formatMemberId(code, seq) {
  const normalizedCode = (code || "ORG").toUpperCase().trim();
  const paddedSeq = String(seq).padStart(3, "0");
  return `${normalizedCode}-${paddedSeq}`;
}
