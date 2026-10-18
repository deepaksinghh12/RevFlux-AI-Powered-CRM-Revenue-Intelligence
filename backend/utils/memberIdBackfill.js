import Organization from "../models/Organization.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import { generateUniqueOrgCode, formatMemberId } from "./memberId.js";

/**
 * Safe, idempotent backfill for organization codes and membership IDs.
 *
 * @param {object} options
 * @param {boolean} [options.dryRun=true] - If true, calculates changes without writing to DB.
 * @param {string|ObjectId} [options.targetOrgId=null] - If provided, restricts backfill to one org.
 * @returns {Promise<object>} Summary report of the backfill run
 */
export async function runMemberIdBackfill({ dryRun = true, targetOrgId = null } = {}) {
  const orgQuery = {};
  if (targetOrgId) {
    orgQuery._id = targetOrgId;
  }

  const organizations = await Organization.find(orgQuery).sort({ createdAt: 1 });
  const results = {
    dryRun,
    totalOrganizations: organizations.length,
    organizationsUpdated: 0,
    membershipsExamined: 0,
    membershipsAssigned: 0,
    membershipsPreserved: 0,
    details: [],
  };

  for (const org of organizations) {
    let orgCodeChanged = false;
    let orgCode = org.code;

    if (!orgCode) {
      if (org.name === "RevFlux QA Workspace") {
        orgCode = "REVQA";
      } else {
        orgCode = await generateUniqueOrgCode(org.name, org._id);
      }
      orgCodeChanged = true;
      if (!dryRun) {
        org.code = orgCode;
        if (!org.nextMemberSeq || org.nextMemberSeq < 1) {
          org.nextMemberSeq = 1;
        }
        await org.save();
      }
    }

    const memberships = await OrganizationMembership.find({ organization: org._id })
      .sort({ createdAt: 1, _id: 1 });

    const assignedSeqs = [];
    const unassignedMemberships = [];

    for (const m of memberships) {
      results.membershipsExamined++;
      if (m.memberId && m.memberSeq) {
        results.membershipsPreserved++;
        assignedSeqs.push(m.memberSeq);
      } else {
        unassignedMemberships.push(m);
      }
    }

    let maxSeq = assignedSeqs.length > 0 ? Math.max(...assignedSeqs) : 0;
    const orgAssignments = [];

    for (const m of unassignedMemberships) {
      let candidateSeq = Math.max(maxSeq + 1, org.nextMemberSeq || 1);

      // Verify candidate is not in assignedSeqs
      while (assignedSeqs.includes(candidateSeq)) {
        candidateSeq++;
      }

      const memberId = formatMemberId(orgCode, candidateSeq);
      assignedSeqs.push(candidateSeq);
      maxSeq = candidateSeq;

      orgAssignments.push({
        membershipId: m._id,
        user: m.user,
        role: m.role,
        memberSeq: candidateSeq,
        memberId,
      });

      if (!dryRun) {
        await OrganizationMembership.updateOne(
          { _id: m._id },
          { $set: { memberSeq: candidateSeq, memberId } }
        );
      }
      results.membershipsAssigned++;
    }

    const targetNextSeq = Math.max(maxSeq + 1, org.nextMemberSeq || 1);
    const counterUpdated = targetNextSeq !== org.nextMemberSeq;

    if (!dryRun && (orgCodeChanged || counterUpdated)) {
      org.nextMemberSeq = targetNextSeq;
      await org.save();
    }

    if (orgCodeChanged || orgAssignments.length > 0 || counterUpdated) {
      results.organizationsUpdated++;
    }

    results.details.push({
      orgId: org._id,
      orgName: org.name,
      orgCode,
      orgCodeGenerated: orgCodeChanged,
      assignedCount: orgAssignments.length,
      preservedCount: memberships.length - unassignedMemberships.length,
      nextMemberSeq: targetNextSeq,
      assignments: orgAssignments,
    });
  }

  return results;
}
