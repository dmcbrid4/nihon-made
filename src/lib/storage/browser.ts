import { applyAction, initialState } from "../study/state";
import {
  stateSchema,
  type StudyAction,
  type StudyRepository,
  type StudyState,
} from "../study/types";

export const STORAGE_KEY = "nihon-made:study:v1";

export class BrowserRepository implements StudyRepository {
  async load(): Promise<StudyState> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw)
      return initialState(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const result = stateSchema.safeParse(JSON.parse(raw));
    if (!result.success)
      throw new Error(
        "Your saved data could not be read. It has been kept intact; export it from Settings before resetting browser storage.",
      );
    return result.data;
  }

  async dispatch(action: StudyAction): Promise<StudyState> {
    const write = async () => {
      const next = applyAction(await this.load(), action);
      // Update the screen only after storage succeeds (including quota errors).
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    };
    return navigator.locks
      ? navigator.locks.request(STORAGE_KEY, write)
      : write();
  }
}
