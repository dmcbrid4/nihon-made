import {
  stateSchema,
  type StudyAction,
  type StudyRepository,
  type StudyState,
} from "../study/types";

async function request(action?: StudyAction): Promise<StudyState> {
  const response = await fetch("/api/study", {
    method: action ? "POST" : "GET",
    cache: "no-store",
    headers: action ? { "Content-Type": "application/json" } : undefined,
    body: action ? JSON.stringify(action) : undefined,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error ?? "Your progress couldn’t be saved. Please try again.",
    );
  return stateSchema.parse(data);
}

export class RemoteRepository implements StudyRepository {
  load() {
    return request();
  }
  dispatch(action: StudyAction) {
    return request(action);
  }
}
