import { criteria, type Criteria } from "#lib/domain/criteria.ts";

export const isCriteriaKey = (key: unknown): key is Criteria => {
	return criteria.includes(key as Criteria);
};
