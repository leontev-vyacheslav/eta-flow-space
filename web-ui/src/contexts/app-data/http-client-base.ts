import axios from 'axios';
import routes from '../../constants/app-api-routes';
import { handleDates } from '../../utils/date-convertor';

const httpClientBase = axios.create({
  baseURL: routes.host
});

httpClientBase.interceptors.response.use((originalResponse) => {
  handleDates(originalResponse.data);

  return originalResponse;
});

export { httpClientBase };