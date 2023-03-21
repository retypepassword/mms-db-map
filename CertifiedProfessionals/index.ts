import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import intercept from 'azure-function-log-intercept';
import { run } from './backend';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    intercept(context);
    const cachedData = context.bindings.cachedData;
    const url = new URL(req.url)
    
    if ((cachedData && Date.now() <= cachedData.expiresAt) || url.searchParams.get('cache') === 'false') {
        context.res = {
            body: JSON.stringify(cachedData.data),
            headers: {
                'Content-Type': 'application/json'
            }
        };
        return;
    }

    const list = url.searchParams.get('list') ?? 'lap';
    const response = await run({ list });
    context.log(`HTTP trigger function processed a request for ${url.pathname}`);

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: JSON.stringify(response),
        headers: {
            'Content-Type': 'application/json'
        }
    };

    context.bindings.newCachedData = JSON.stringify({
        expiresAt: Date.now() + 86400 * 1000,
        data: response
    });
};

export default httpTrigger;
