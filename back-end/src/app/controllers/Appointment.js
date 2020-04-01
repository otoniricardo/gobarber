import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore } from 'date-fns';
import Appointment from '../models/Appointment';
import User from '../models/User';

class AppointmentController {
  async store(req, res) {
    const schema = Yup.object().shape({
      providerId: Yup.number().required(),
      date: Yup.date().required(),
    });
    if (!(await schema.isValid(req.body)))
      return res.status(400).json({ error: 'validation fails' });

    const { providerId, date } = req.body;

    const isProvider = await User.findOne({
      where: { id: providerId, provider: true },
    });
    if (!isProvider)
      return res
        .status(401)
        .json({ error: 'you can only create appointments with providers' });

    const hourStart = startOfHour(parseISO(date));
    if (isBefore(hourStart, new Date()))
      return res.status(401).json({ error: 'past dates are not permited' });

    const isNotAvaliable = await Appointment.findOne({
      where: {
        providerId,
        canceledAt: null,
        date: hourStart,
      },
    });
    if (isNotAvaliable)
      return res
        .status(401)
        .json({ error: 'appointment date is not avaliable' });

    const appointment = await Appointment.create({
      userId: req.userId,
      providerId,
      date: hourStart,
    });

    return res.json(appointment);
  }
}
export default new AppointmentController();
