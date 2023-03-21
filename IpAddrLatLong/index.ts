import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { WebServiceClient } from "@maxmind/geoip2-node";
import intercept from 'azure-function-log-intercept';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  intercept(context);
  if (!process.env.MAXMIND_GEOLITE_KEY) {
    context.res = {
      status: 500,
    };
    return;
  }
  console.log(JSON.stringify(req.headers));
  const ipAddr = req.headers['x-forwarded-for']?.split(':')[0];
  if (!ipAddr || !/^(\d{1,3}\.){3}\d{1,3}$/.test(ipAddr)) {
    context.res = {
      status: 404
    };
    return;
  }

  const client = new WebServiceClient('842331', process.env.MAXMIND_GEOLITE_KEY, { host: 'geolite.info' });
  const response = await client.city(ipAddr)
  const body = {
    lat: response.location?.latitude,
    lng: response.location?.longitude,
  }

  context.res = {
    body
  };

};

export default httpTrigger;