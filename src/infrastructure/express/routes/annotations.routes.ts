import { Router } from 'express';
import { AnnotationsController } from '../../../presentation/controllers/annotations.controller';

export function createAnnotationsRouter(
    controller: AnnotationsController
): Router {
    const router = Router();
    router.post('/', controller.addAnnotation);
    return router;
}