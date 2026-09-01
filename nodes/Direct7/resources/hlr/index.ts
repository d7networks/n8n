import type { INodeProperties } from 'n8n-workflow';

const showOnlyForHlr = {
	resource: ['hlr'],
};

const showOnlyForHlrLookup = {
	resource: ['hlr'],
	operation: ['lookup'],
};

const showOnlyForHlrGetReport = {
	resource: ['hlr'],
	operation: ['getReport'],
};

export const hlrDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForHlr,
		},
		options: [
			{
				name: 'Number Lookup',
				value: 'lookup',
				action: 'Perform a number lookup',
				description: 'Submit a number lookup (HLR) request for a recipient number',
				routing: {
					request: {
						method: 'POST',
						url: '/hlr/v1/lookup',
						body: {
							recipient: '={{$parameter.recipient}}',
						},
					},
				},
			},
			{
				name: 'Get Lookup Report',
				value: 'getReport',
				action: 'Get a number lookup report',
				description: 'Get the HLR lookup status and result by request ID',
				routing: {
					request: {
						method: 'GET',
						url: '=/hlr/v1/report/{{$parameter.requestId}}',
					},
				},
			},
		],
		default: 'lookup',
	},

	// ─── Lookup ──────────────────────────────────────────────────────────────────
	{
		displayName: 'Recipient',
		name: 'recipient',
		type: 'string',
		required: true,
		default: '',
		placeholder: '+1234567890',
		displayOptions: {
			show: showOnlyForHlrLookup,
		},
		description: 'The phone number to look up, including country code (e.g. +1234567890)',
	},

	// ─── Get Report ──────────────────────────────────────────────────────────────
	{
		displayName: 'Request ID',
		name: 'requestId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: showOnlyForHlrGetReport,
		},
		description: 'Request ID returned from the Number Lookup operation',
	},
];
