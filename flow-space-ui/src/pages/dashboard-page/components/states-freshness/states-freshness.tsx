import { WarningIcon } from '../../../../constants/app-icons';

import './states-freshness.scss';

// the time alone today; with the date when the page has had no new data since an earlier day
const formatReceivedAt = (receivedAt: Date) => receivedAt.toDateString() === new Date().toDateString()
    ? receivedAt.toLocaleTimeString('ru-RU')
    : receivedAt.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'medium' });

// when the page last received the device states from the server (the device's own poll time is on the diagram);
// after failed polls the time stays, marked as stale, while the diagram keeps the values received then
export const StatesFreshness = ({ receivedAt, isStale }: { receivedAt?: Date, isStale: boolean }) => {
    if (!receivedAt) {
        return null;
    }
    const time = formatReceivedAt(receivedAt);

    return isStale
        ? <span className='states-freshness states-freshness-stale' title='Сервер не ответил на последний запрос. На схеме значения, полученные в это время'>
            <WarningIcon size={12} />нет связи с сервером, данные на {time}
        </span>
        : <span className='states-freshness' title='Когда страница последний раз получила данные с сервера. Они обновляются каждые 10 секунд'>
            обновлено {time}
        </span>;
};
