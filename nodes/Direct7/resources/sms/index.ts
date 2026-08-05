import type { INodeProperties } from 'n8n-workflow';

const showOnlyForSms = {
	resource: ['sms'],
};

const showOnlyForSmsSend = {
	resource: ['sms'],
	operation: ['send'],
};

const showOnlyForSmsGetReport = {
	resource: ['sms'],
	operation: ['getReport'],
};

const showOnlyForSmsGetPricing = {
	resource: ['sms'],
	operation: ['getPricing'],
};

const showOnlyForSingleMode = {
	resource: ['sms'],
	operation: ['send'],
	sendMode: ['single'],
};

const showOnlyForMultipleMode = {
	resource: ['sms'],
	operation: ['send'],
	sendMode: ['multiple'],
};

const smsSendBody = `={{ (() => {
	const normalizeString = (value) => {
		if (typeof value !== 'string') return undefined;
		const trimmed = value.trim();
		return trimmed === '' ? undefined : trimmed;
	};

	const parseRecipients = (value) => {
		if (!value) throw new Error('At least one recipient is required');
		const list = String(value)
			.split(',')
			.map((r) => r.trim())
			.filter((r) => r.length > 0);
		if (!list.length) throw new Error('At least one recipient is required');
		return list;
	};

	const sendMode = $parameter.sendMode;
	const channel = 'sms';
	const originator = normalizeString($parameter.originator);
	const reportUrl = normalizeString($parameter.reportUrl);
	const globalTag = normalizeString($parameter.globalTag);
	const scheduleTime = normalizeString($parameter.scheduleTime);
	const numLookup = $parameter.numLookup === true ? true : undefined;

	if (!originator) throw new Error('Originator is required');

	const messageGlobals = {
		originator,
		report_url: reportUrl,
		tag: globalTag,
		schedule_time: scheduleTime,
		num_lookup: numLookup,
	};

	if (sendMode === 'single') {
		const recipients = parseRecipients($parameter.recipients);
		const content = normalizeString($parameter.content);
		const dataCoding = normalizeString($parameter.dataCoding) ?? 'text';
		const msgType = normalizeString($parameter.msgType) ?? 'text';
		const tag = normalizeString($parameter.messageTag);

		if (!content) throw new Error('Content is required');

		return {
			messages: [
				{
					channel,
					recipients,
					content,
					msg_type: msgType,
					data_coding: dataCoding,
					tag,
				},
			],
			message_globals: messageGlobals,
		};
	}

	if (sendMode === 'multiple') {
		const messageRows = $parameter.smsMessages?.values ?? [];

		if (!messageRows.length) throw new Error('At least one message is required');

		const messages = messageRows.map((msg, index) => {
			const recipients = parseRecipients(msg.recipients);
			const content = normalizeString(msg.content);
			const dataCoding = normalizeString(msg.dataCoding) ?? 'text';
			const msgType = normalizeString(msg.msgType) ?? 'text';
			const tag = normalizeString(msg.tag);

			if (!content) throw new Error(\`Content is required for message \${index + 1}\`);

			return {
				recipients,
				content,
				msg_type: msgType,
				data_coding: dataCoding,
				tag,
			};
		});

		return {
			messages,
			message_globals: {
				channel,
				...messageGlobals,
			},
		};
	}

	throw new Error('Unsupported send mode');
})() }}`;

const dataCodingOptions = [
	{
		name: 'Text',
		value: 'text',
		description: 'Normal GSM 03.38 characters (English and standard characters)',
	},
	{
		name: 'Unicode',
		value: 'unicode',
		description:
			'Non-GSM 03.38 characters such as Arabic, Chinese, Hebrew, Greek and other regional languages',
	},
	{
		name: 'Auto',
		value: 'auto',
		description: 'Automatically detect encoding based on the message content',
	},
];

const msgTypeOptions = [
	{ name: 'Text', value: 'text' },
	{ name: 'Audio SMS', value: 'audio' },
	{ name: 'Multimedia', value: 'multimedia' },
	{ name: 'Image', value: 'image' },
];

export const smsDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForSms,
		},
		options: [
			{
				name: 'Get Pricing',
				value: 'getPricing',
				action: 'Get SMS pricing',
				description: 'Get SMS pricing for all countries or a specific country',
				routing: {
					request: {
						method: 'GET',
						url: '/messages/v1/sms/pricing',
						qs: {
							country_iso: '={{$parameter.countryIso || undefined}}',
						},
					},
				},
			},
			{
				name: 'Get Status Report',
				value: 'getReport',
				action: 'Get an SMS status report',
				description: 'Get SMS message log and delivery status by request ID',
				routing: {
					request: {
						method: 'GET',
						url: '=/report/v1/message-log/{{$parameter.requestId}}',
					},
				},
			},
			{
				name: 'Send Message',
				value: 'send',
				action: 'Send an SMS message',
				description: 'Send an SMS message via Direct7',
				routing: {
					request: {
						method: 'POST',
						url: '/messages/v1/send',
						body: smsSendBody,
					},
				},
			},
		],
		default: 'send',
	},

	// ─── Get Report ─────────────────────────────────────────────────────────────
	{
		displayName: 'Request ID',
		name: 'requestId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: showOnlyForSmsGetReport,
		},
		description: 'Request ID returned when sending an SMS message',
	},

	// ─── Get Pricing ─────────────────────────────────────────────────────────────
	{
		displayName: 'Country ISO Code',
		name: 'countryIso',
		type: 'string',
		default: '',
		placeholder: 'AE',
		displayOptions: {
			show: showOnlyForSmsGetPricing,
		},
		description:
			'ISO 3166-1 alpha-2 country code to retrieve pricing for a specific country (e.g. AE, US, GB). Leave empty to retrieve pricing for all countries.',
	},

	// ─── Send: mode ─────────────────────────────────────────────────────────────
	{
		displayName: 'Send Mode',
		name: 'sendMode',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Same Content to Multiple Recipients',
				value: 'single',
				description: 'Send the same message to one or more recipients',
			},
			{
				name: 'Different Content Per Destination',
				value: 'multiple',
				description: 'Send different message content to different recipient groups',
			},
		],
		default: 'single',
		displayOptions: {
			show: showOnlyForSmsSend,
		},
	},

	// ─── Send: single mode fields ────────────────────────────────────────────────
	{
		displayName: 'Recipients',
		name: 'recipients',
		type: 'string',
		required: true,
		default: '',
		placeholder: '+1234567890, +9876543210',
		displayOptions: {
			show: showOnlyForSingleMode,
		},
		description:
			'Comma-separated list of mobile numbers to send the SMS to, including country code (e.g. +1234567890)',
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: {
			rows: 3,
		},
		required: true,
		default: '',
		displayOptions: {
			show: showOnlyForSingleMode,
		},
		description: 'The message content being sent',
	},
	{
		displayName: 'Message Type',
		name: 'msgType',
		type: 'options',
		options: msgTypeOptions,
		default: 'text',
		displayOptions: {
			show: showOnlyForSingleMode,
		},
		description: 'Type of message content to send',
	},
	{
		displayName: 'Data Coding',
		name: 'dataCoding',
		type: 'options',
		options: dataCodingOptions,
		default: 'text',
		displayOptions: {
			show: showOnlyForSingleMode,
		},
		description:
			'Character encoding for the message. Use &lt;strong&gt;text&lt;/strong&gt; for normal GSM characters, &lt;strong&gt;unicode&lt;/strong&gt; for regional/special characters, or &lt;strong&gt;auto&lt;/strong&gt; to detect automatically.',
	},
	{
		displayName: 'Tag',
		name: 'messageTag',
		type: 'string',
		default: '',
		displayOptions: {
			show: showOnlyForSingleMode,
		},
		description: 'Any string you can add as a message reference',
	},

	// ─── Send: multiple mode fields ──────────────────────────────────────────────
	{
		displayName: 'Messages',
		name: 'smsMessages',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Message',
		default: {},
		required: true,
		displayOptions: {
			show: showOnlyForMultipleMode,
		},
		description: 'List of SMS messages to send, each with its own recipients and content',
		options: [
			{
				name: 'values',
				displayName: 'Message',
				values: [
					{
						displayName: 'Content',
						name: 'content',
						type: 'string',
						typeOptions: {
							rows: 3,
						},
						required: true,
						default: '',
						description: 'The message content being sent to this group of recipients',
					},
					{
						displayName: 'Data Coding',
						name: 'dataCoding',
						type: 'options',
						options: dataCodingOptions,
						default: 'text',
						description:
							'Character encoding for this message. Use text for normal GSM characters, unicode for regional/special characters, or auto to detect automatically.',
					},
					{
						displayName: 'Message Type',
						name: 'msgType',
						type: 'options',
						options: msgTypeOptions,
						default: 'text',
						description: 'Type of message content to send',
					},
					{
						displayName: 'Recipients',
						name: 'recipients',
						type: 'string',
						required: true,
						default: '',
						placeholder: '+1234567890, +9876543210',
						description:
							'Comma-separated list of mobile numbers to send to, including country code',
					},
					{
						displayName: 'Tag',
						name: 'tag',
						type: 'string',
						default: '',
						description: 'Any string you can add as a message reference',
					},
				],
			},
		],
	},

	// ─── Send: global options ────────────────────────────────────────────────────
	{
		displayName: 'Originator',
		name: 'originator',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'SignOTP',
		displayOptions: {
			show: showOnlyForSmsSend,
		},
		description:
			'Brand name or number that shows up on the receiving phone, indicating who sent the text message',
	},
	{
		displayName: 'Report URL',
		name: 'reportUrl',
		type: 'string',
		default: '',
		placeholder: 'https://example.com/delivery-report',
		displayOptions: {
			show: showOnlyForSmsSend,
		},
		description: 'Webhook URL to receive delivery report (DLR) for your message (optional)',
	},
	{
		displayName: 'Schedule Time',
		name: 'scheduleTime',
		type: 'string',
		default: '',
		placeholder: '2023-04-19T16:18+04:00',
		displayOptions: {
			show: showOnlyForSmsSend,
		},
		description:
			'Schedule the request to send at a specific time. Format: YYYY-MM-DDTHH:MM+HH:MM. Leave empty to send immediately.',
	},
	{
		displayName: 'Number Lookup',
		name: 'numLookup',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: showOnlyForSmsSend,
		},
		description:
			'Whether to look up the recipient number and send the SMS only when the number is active',
	},
	{
		displayName: 'Global Tag',
		name: 'globalTag',
		type: 'string',
		default: '',
		displayOptions: {
			show: showOnlyForSmsSend,
		},
		description:
			'Any string that can be added as a global message reference for all messages in this request (optional)',
	},
];
