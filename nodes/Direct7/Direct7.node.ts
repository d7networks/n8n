import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { whatsappDescription } from './resources/whatsapp/index';
import { smsDescription } from './resources/sms/index';
import { hlrDescription } from './resources/hlr/index';
import { DIRECT7_BASE_URL } from './constants/EnvironmentalConf';


export class Direct7 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Direct7',
		name: 'direct7',
		icon: { light: 'file:direct7.svg', dark: 'file:direct7.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Direct7 API',
		defaults: {
			name: 'Direct7',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'direct7Api', required: true }],
		requestDefaults: {
			baseURL: DIRECT7_BASE_URL,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'HLR (Number Lookup)',
						value: 'hlr',
					},
					{
						name: 'SMS',
						value: 'sms',
					},
					{
						name: 'WhatsApp',
						value: 'whatsapp',
					},
				],
				default: 'sms',
			},
			...hlrDescription,
			...smsDescription,
			...whatsappDescription,
		],
	};
}
