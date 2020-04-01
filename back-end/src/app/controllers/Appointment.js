import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';
import Appointment from '../models/Appointment';
import User from '../models/User';
import File from '../models/File';
import Notification from '../schemas/Notification';

import Queue from '../../lib/Queue';
import CancellationMail from '../jobs/CancellationMail';

class AppointmentController {
  async delete(req, res) {
    const { id } = req.params;
    const appointment = await Appointment.findOne({
      where: { id, canceledAt: null },
      include: [
        { model: User, as: 'provider', attributes: ['name', 'email'] },
        { model: User, as: 'user', attributes: ['name'] },
      ],
      attributes: ['id', 'date', 'userId', 'providerId'],
    });

    if (!appointment)
      return res.status(400).json({
        error: 'appointment not found',
      });

    if (appointment.userId !== req.userId)
      return res.status(401).json({
        error: 'you do not have permission to cancel this appointment',
      });

    const dateWithSub = subHours(appointment.date, 2);

    if (isBefore(dateWithSub, new Date()))
      return res.status(401).json({
        error: 'you can only cancel appointments 2 hours in advance',
      });

    const canceledAppointment = await appointment.update({
      canceledAt: new Date(),
    });

    await Queue.add(CancellationMail.key, { appointment });
    // await Mail.sendMail({
    //   to: `${appointment.provider.name} <${appointment.provider.email}>`,
    //   subject: 'Agendamento Cancelado',
    //   template: 'cancellation',
    //   context: {
    //     provider: appointment.provider.name,
    //     user: appointment.user.name,
    //     date: format(appointment.date, "'dia' dd 'de' MMMM', às' H:mm'h'", {
    //       locale: pt,
    //     }),
    //   },
    // });

    return res.json(canceledAppointment);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      providerId: Yup.number().required(),
      date: Yup.date().required(),
    });
    if (!(await schema.isValid(req.body)))
      return res.status(400).json({ error: 'validation fails' });

    const { providerId, date } = req.body;

    if (providerId === req.userId)
      return res
        .status(400)
        .json({ error: 'you can not make an appointment with yourself' });

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
