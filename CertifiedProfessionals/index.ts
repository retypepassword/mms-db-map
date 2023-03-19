import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { run } from './backend';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const url = new URL(req.url)
    const list = url.searchParams.get('list') ?? 'guide';
    const response = JSON.stringify(await run({ list }));
    context.log(`HTTP trigger function processed a request for ${url.pathname}`);

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: response,
        headers: {
            'Content-Type': 'application/json'
        }
    };

};

export default httpTrigger;
