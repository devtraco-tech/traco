import {
  OFFICIAL_TRAINING_DOCUMENTS,
  TRAINING_VERSION,
  type OfficialTrainingDocument,
} from "./official-training.js";
import {
  PROSTHODONTICS_TRAINING_DOCUMENTS,
  PROSTHODONTICS_TRAINING_VERSION,
} from "./prosthodontics-training.js";

export type CourseTrainingPackage = {
  version: string;
  documents: OfficialTrainingDocument[];
};

const PROSTHODONTICS_SLUG = "especializacao-em-protese-dentaria";

export function getCourseTraining(slug: string | null | undefined): CourseTrainingPackage {
  if (slug === PROSTHODONTICS_SLUG) {
    return {
      version: PROSTHODONTICS_TRAINING_VERSION,
      documents: PROSTHODONTICS_TRAINING_DOCUMENTS,
    };
  }

  return {
    version: TRAINING_VERSION,
    documents: OFFICIAL_TRAINING_DOCUMENTS,
  };
}
