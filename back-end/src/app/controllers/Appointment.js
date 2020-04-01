import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format } from 'date-fns';
import pt from 'date-fns/locale/pt';
import Appointment from '../models/Appointment';
import User from '../models/User';
import File from '../models/File';

import Notification from '../schemas/Notification';

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

    const { name } = await User.findByPk(req.userId, { attributes: ['name'] });
    const formattedDate = format(
      hourStart,
      "'dia' dd 'de' MMMM', às' H:mm'h'",
      { locale: pt }
    );

    await Notification.create({
      content: `Novo agendamento de ${name} para ${formattedDate}`,
      user: providerId,
    });

    return res.json(appointment);
  }

  async index(req, res) {
    const { page } = req.query;

    const appointments = await Appointment.findAll({
      where: {
        userId: req.userId,
        canceledAt: null,
      },
      order: ['date'],
      attributes: ['id', 'date'],
      limit: 20,
      offset: (page - 1) * 20,
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [{ model: File, as: 'avatar', attributes: ['path', 'url'] }],
        },
      ],
    });

    return res.json(appointments);
  }
}
export default new AppointmentController();
