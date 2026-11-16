import {
    AddAnnotationUseCase,
    IAddAnnotationInput,
    IAddAnnotationResult,
} from './use-cases/annotations/add-annotation.use-case';

export class AnnotationsOrchestrator {
    constructor(private addAnnotationUseCase: AddAnnotationUseCase) {}

    async addAnnotation(input: IAddAnnotationInput): Promise<IAddAnnotationResult> {
        return this.addAnnotationUseCase.execute(input);
    }
}