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
  const client = new WebServiceClient('842331', process.env.MAXMIND_GEOLITE_KEY, { host: 'geolite.info' });
  const response = await client.city(req.headers['x-forwarded-for'])
  const body = {
    lat: response.location?.latitude,
    lng: response.location?.longitude,
  }

  context.res = {
    body
  };

};

export default httpTrigger;