import { Router } from 'express';
import { GigController } from '../controllers/GigController';
import { GigService } from '../../application/services/GigService';
import { GigRepository } from '../database/mongoose/repositories/GigRepository';
import { GigModel } from '../database/mongoose/models';

const router = Router();

const gigRepository = new GigRepository(GigModel);
const gigService = new GigService(gigRepository);
const gigController = new GigController(gigService);

router.post('/', gigController.create.bind(gigController));
router.get('/', gigController.findAll.bind(gigController));
router.get('/:id', gigController.findById.bind(gigController));
router.put('/:id', gigController.update.bind(gigController));
router.delete('/:id', gigController.delete.bind(gigController));

export const gigRoutes = router;