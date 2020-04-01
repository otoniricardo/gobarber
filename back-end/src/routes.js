import { Router } from 'express';
import multer from 'multer';
import multerConfig from './config/multer';

import UserController from './app/controllers/User';
import SessionController from './app/controllers/Session';
import FileController from './app/controllers/File';
import ProviderController from './app/controllers/Provider';
import AppointmentController from './app/controllers/Appointment';
import ScheduleController from './app/controllers/Schedule';
import NotificationController from './app/controllers/Notification';
import AvaliableController from './app/controllers/Avaliable';

import authMiddleware from './app/middlewares/auth';

const routes = new Router();
const upload = multer(multerConfig);

routes.post('/users', UserController.store);
routes.post('/session', SessionController.store);

routes.use(authMiddleware);

routes.put('/users', UserController.update);

routes.get('/providers', ProviderController.index);

routes.get('/providers/:providerId/avaliable', AvaliableController.index);

routes.post('/appointments', AppointmentController.store);

routes.get('/appointments', AppointmentController.index);

routes.delete('/appointments/:id', AppointmentController.delete);

routes.get('/schedule', ScheduleController.index);

routes.get('/notifications', NotificationController.index);

routes.put('/notifications/:id', NotificationController.update);

routes.post('/files', upload.single('file'), FileController.store);

export default routes;
