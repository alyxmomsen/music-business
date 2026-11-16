import { Request, Response, NextFunction } from 'express';
import { AnnotationsOrchestrator } from '../../application/annotations-orchestrator';
import { TCommentTarget } from '../../domain/comment';
import { IAuthRequest } from '../../infrastructure/express/middleware/auth.middleware';

export class AnnotationsController {
    constructor(private readonly orchestrator: AnnotationsOrchestrator) {}

    addAnnotation = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { comment, tags, target } = req.body as {
                comment?: string | null;
                tags?: string[];
                target?: TCommentTarget;
            };

            if (!target || typeof target !== 'object' || !target.type) {
                return res.status(400).json({ error: 'target is required' });
            }

            const authorId = (req as unknown as IAuthRequest).userId;
            if (!authorId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const result = await this.orchestrator.addAnnotation({
                comment: typeof comment === 'string' ? comment : null,
                tags: Array.isArray(tags) ? tags : [],
                target,
                authorId,
            });

            res.status(201).json({
                comment: result.comment?.getState() ?? null,
                tags: result.tags.map((t) => t.getState()),
            });
        } catch (err) {
            if (err instanceof Error) {
                return res.status(400).json({ error: err.message });
            }
            next(err);
        }
    };
}