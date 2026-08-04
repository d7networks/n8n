import type { INodeProperties } from 'n8n-workflow';

const showOnlyForWhatsApp = {
	resource: ['whatsapp'],
};

const showOnlyForWhatsAppSend = {
	resource: ['whatsapp'],
	operation: ['send'],
};

const showOnlyForWhatsAppGetReport = {
	resource: ['whatsapp'],
	operation: ['getReport'],
};
const showOnlyForReadReceipts = {
	resource: ['whatsapp'],
	operation: ['readReceipts'],
};

const showOnlyForDownloadMedia = {
	resource: ['whatsapp'],
	operation: ['downloadMedia'],
};

const whatsappSendBody = `={{ (() => {
	const normalizeString = (value) => {
		if (typeof value !== 'string') return undefined;

		const trimmed = value.trim();
		return trimmed === '' ? undefined : trimmed;
	};

	const normalizeNumber = (value) => {
		if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;

		const normalized = normalizeString(value);
		if (!normalized) return undefined;

		const parsed = Number.parseFloat(normalized);
		return Number.isFinite(parsed) ? parsed : undefined;
	};

	const messageType = $parameter.messageType;
	const reportUrl = normalizeString($parameter.reportUrl);

	const buildInteractiveHeader = (type) => {
		if (type === 'none') return undefined;

		if (type === 'text') {
			const text = normalizeString($parameter.interactiveHeaderText);
			if (!text) {
				throw new Error('Interactive header text is required');
			}

			return {
				type: 'text',
				text,
			};
		}

		const mediaLink = normalizeString($parameter.interactiveHeaderMediaUrl);
		if (!mediaLink) {
			throw new Error('Interactive header media URL is required');
		}

		return {
			type,
			[type]: {
				link: mediaLink,
			},
		};
	};

	const buildContent = () => {
		if (messageType === 'TEXT') {
			return {
				message_type: 'TEXT',
				text: {
					preview_url: $parameter.previewUrl,
					body: $parameter.messageBody,
				},
			};
		}

		if (messageType === 'ATTACHMENT') {
			const attachmentType = $parameter.attachmentType;
			const allowCaption = ['document', 'image', 'video'].includes(attachmentType);

			return {
				message_type: 'ATTACHMENT',
				attachment: {
					type: attachmentType,
					caption: allowCaption ? normalizeString($parameter.attachmentCaption) : undefined,
					url: $parameter.attachmentUrl,
				},
			};
		}

		if (messageType === 'LOCATION') {
			const longitude = normalizeNumber($parameter.locationLongitude);
			const latitude = normalizeNumber($parameter.locationLatitude);

			if (longitude === undefined || latitude === undefined) {
				throw new Error('Location longitude and latitude are required');
			}

			return {
				message_type: 'LOCATION',
				location: {
					longitude,
					latitude,
					name: normalizeString($parameter.locationName),
					address: normalizeString($parameter.locationAddress),
				},
			};
		}

		if (messageType === 'CONTACTS') {
			const contacts = $parameter.contacts?.values ?? [];

			if (!contacts.length) {
				throw new Error('At least one contact is required');
			}

			if (contacts.length > 10) {
				throw new Error('Maximum 10 contacts are allowed');
			}

			return {
				message_type: 'CONTACTS',
				contacts: contacts.map((contact) => {
					const firstName = normalizeString(contact.firstName);
					const formattedName = normalizeString(contact.formattedName) ?? firstName;

					if (!firstName || !formattedName) {
						throw new Error('Contact first name and formatted name are required');
					}

					const phones = (contact.phones?.values ?? [])
						.map((phone) => ({ phone: normalizeString(phone.phone) }))
						.filter((phone) => phone.phone);

					if (!phones.length) {
						throw new Error('Each contact must include at least one phone');
					}

					const emails = (contact.emails?.values ?? [])
						.map((email) => ({ email: normalizeString(email.email) }))
						.filter((email) => email.email);

					const urls = (contact.urls?.values ?? [])
						.map((url) => ({ url: normalizeString(url.url) }))
						.filter((url) => url.url);

					return {
						name: {
							first_name: firstName,
							last_name: normalizeString(contact.lastName),
							formatted_name: formattedName,
						},
						birthday: normalizeString(contact.birthday),
						phones,
						emails: emails.length ? emails : undefined,
						urls: urls.length ? urls : undefined,
					};
				}),
			};
		}

		if (messageType === 'INTERACTIVE') {
			const interactiveType = $parameter.interactiveType;
			const bodyText = normalizeString($parameter.interactiveBodyText);
			const footerText = normalizeString($parameter.interactiveFooterText);
			const headerType = $parameter.interactiveHeaderType;

			if (!bodyText) {
				throw new Error('Interactive body text is required');
			}

			const typesWithHeader = ['cta_url', 'button', 'list'];

			const interactive = {
				type: interactiveType,
				header: typesWithHeader.includes(interactiveType)
					? buildInteractiveHeader(headerType)
					: undefined,
				body: { text: bodyText },
				footer: footerText ? { text: footerText } : undefined,
				action: undefined,
			};

			if (interactiveType === 'cta_url') {
				const displayText = normalizeString($parameter.interactiveCtaDisplayText);
				const url = normalizeString($parameter.interactiveCtaUrl);

				if (!displayText || !url) {
					throw new Error('CTA display text and URL are required');
				}

				interactive.action = {
					parameters: {
						display_text: displayText,
						url,
					},
				};
			}

			if (interactiveType === 'button') {
				const buttons = $parameter.interactiveButtons?.values ?? [];

				if (!buttons.length) {
					throw new Error('At least one interactive button is required');
				}

				if (buttons.length > 3) {
					throw new Error('Maximum 3 interactive buttons are allowed');
				}

				interactive.action = {
					buttons: buttons.map((button) => {
						const id = normalizeString(button.id);
						const title = normalizeString(button.title);

						if (!id || !title) {
							throw new Error('Each interactive button must have an ID and title');
						}

						return {
							type: 'reply',
							reply: {
								id,
								title,
							},
						};
					}),
				};
			}

			if (interactiveType === 'list') {
				const buttonText = normalizeString($parameter.interactiveListButtonText);
				const sections = $parameter.interactiveListSections?.values ?? [];

				if (!buttonText) {
					throw new Error('List button text is required');
				}

				if (!sections.length) {
					throw new Error('At least one interactive list section is required');
				}

				let totalRows = 0;
				const seenRowIds = new Set();
				const seenRowTitles = new Set();

				const mappedSections = sections.map((section) => {
					const title = normalizeString(section.title);
					const rows = section.rows?.values ?? [];

					if (!title) {
						throw new Error('Each interactive list section must have a title');
					}

					if (!rows.length) {
						throw new Error('Each interactive list section must include at least one row');
					}

					totalRows += rows.length;

					return {
						title,
						rows: rows.map((row) => {
							const id = normalizeString(row.id);
							const rowTitle = normalizeString(row.title);

							if (!id || !rowTitle) {
								throw new Error('Each interactive list row must have an ID and title');
							}

							if (seenRowIds.has(id)) {
								throw new Error(\`Duplicate interactive list row ID found: \${id}\`);
							}
							seenRowIds.add(id);

							if (seenRowTitles.has(rowTitle)) {
								throw new Error(\`Duplicate interactive list row title found: \${rowTitle}\`);
							}
							seenRowTitles.add(rowTitle);

							return {
								id,
								title: rowTitle,
								description: normalizeString(row.description),
							};
						}),
					};
				});

				if (totalRows > 10) {
					throw new Error('Maximum 10 interactive list rows are allowed in total');
				}

				interactive.action = {
					button: buttonText,
					sections: mappedSections,
				};
			}

			if (interactiveType === 'location_request_message') {
				interactive.action = {
					name: 'send_location',
				};
			}

			return {
				message_type: 'INTERACTIVE',
				interactive,
			};
		}

		if (messageType === 'TEMPLATE') {
			const templateId = normalizeString($parameter.templateId);
			const templateLanguage = normalizeString($parameter.templateLanguage);

			if (!templateId) {
				throw new Error('Template ID is required');
			}

			if (!templateLanguage) {
				throw new Error('Template language is required');
			}

			const bodyParamRows = $parameter.templateBodyParameters?.values ?? [];
			const bodyParameterValues = bodyParamRows.length
				? Object.fromEntries(
						bodyParamRows.map((row, index) => [String(index), normalizeString(row.value) ?? '']),
				  )
				: undefined;

			const mediaType = $parameter.templateMediaType;
			let media;

			if (mediaType === 'text') {
				const textHeaderTitle = normalizeString($parameter.templateMediaTextHeaderTitle);

				if (!textHeaderTitle) {
					throw new Error('Text header title is required for text media');
				}

				media = {
					media_type: 'text',
					text_header_title: textHeaderTitle,
				};
			} else if (mediaType === 'image' || mediaType === 'video') {
				const mediaUrl = normalizeString($parameter.templateMediaUrl);

				if (!mediaUrl) {
					throw new Error('Media URL is required');
				}

				media = {
					media_type: mediaType,
					media_url: mediaUrl,
				};
			} else if (mediaType === 'location') {
				const latitude = normalizeString($parameter.templateMediaLocationLatitude);
				const longitude = normalizeString($parameter.templateMediaLocationLongitude);

				if (!latitude || !longitude) {
					throw new Error('Latitude and longitude are required for location media');
				}

				media = {
					media_type: 'location',
					location: {
						latitude,
						longitude,
						name: normalizeString($parameter.templateMediaLocationName),
						address: normalizeString($parameter.templateMediaLocationAddress),
					},
				};
			}

			let limitedTimeOffer;

			if ($parameter.templateEnableLimitedTimeOffer) {
				const expirationTimeMs = normalizeNumber($parameter.templateLimitedTimeOfferExpiration);

				if (expirationTimeMs === undefined) {
					throw new Error('Expiration time (ms) is required for limited time offer');
				}

				limitedTimeOffer = {
					expiration_time_ms: expirationTimeMs,
				};
			}

			const buttonsType = $parameter.templateButtonsType;
			let buttons;

			if (buttonsType === 'quick_replies') {
				const quickReplies = $parameter.templateQuickReplyButtons?.values ?? [];

				if (!quickReplies.length) {
					throw new Error('At least one quick reply button is required');
				}

				buttons = {
					quick_replies: quickReplies.map((button, index) => {
						const payload = normalizeString(button.payload);

						if (!payload) {
							throw new Error('Each quick reply button requires a payload');
						}

						const buttonIndex = normalizeString(button.buttonIndex);

						return {
							button_index: buttonIndex ?? String(index),
							button_payload: payload,
						};
					}),
				};
			} else if (buttonsType === 'actions') {
				const actions = $parameter.templateActionButtons?.values ?? [];

				if (!actions.length) {
					throw new Error('At least one action button is required');
				}

				buttons = {
					actions: actions.map((action, index) => {
						const payload = normalizeString(action.payload);

						if (!payload) {
							throw new Error('Each action button requires a payload');
						}

						const actionIndex = normalizeString(action.actionIndex);

						return {
							action_index: actionIndex ?? String(index),
							action_type: normalizeString(action.actionType) ?? 'url',
							action_payload: payload,
						};
					}),
				};
			} else if (buttonsType === 'coupon_code') {
				const coupons = $parameter.templateCouponButtons?.values ?? [];

				if (!coupons.length) {
					throw new Error('At least one coupon code button is required');
				}

				buttons = {
					coupon_code: coupons.map((coupon, index) => {
						const code = normalizeString(coupon.couponCode);

						if (!code) {
							throw new Error('Each coupon code button requires a code');
						}

						const couponIndex = normalizeNumber(coupon.index);

						return {
							index: couponIndex ?? index,
							type: normalizeString(coupon.type) ?? 'copy_code',
							coupon_code: code,
						};
					}),
				};
			} else if (buttonsType === 'button_flow') {
				const flows = $parameter.templateFlowButtons?.values ?? [];

				if (!flows.length) {
					throw new Error('At least one flow button is required');
				}

				buttons = {
					button_flow: flows.map((flow, index) => {
						let flowActionData = {};
						const rawFlowActionData = normalizeString(flow.flowActionData);

						if (rawFlowActionData) {
							try {
								flowActionData = JSON.parse(rawFlowActionData);
							} catch (error) {
								throw new Error('Flow action data must be valid JSON');
							}
						}

						const flowIndex = normalizeString(flow.index);

						return {
							flow_token: normalizeString(flow.flowToken) ?? 'unused',
							action_type: normalizeString(flow.actionType) ?? 'flow',
							index: flowIndex ?? String(index),
							flow_action_data: flowActionData,
						};
					}),
				};
			}

			let carousel;

			if ($parameter.templateUseCarousel) {
				const cards = $parameter.templateCarouselCards?.values ?? [];

				if (!cards.length) {
					throw new Error('At least one carousel card is required');
				}

				carousel = {
					cards: cards.map((card, cardIndex) => {
						const components = [];
						const headerType = card.headerType;

						if (headerType === 'image_link' || headerType === 'image_id') {
							const headerLink = normalizeString(card.headerImageUrl);
							const headerMediaId = normalizeString(card.headerImageId);
							const image = headerType === 'image_link' ? { link: headerLink } : { id: headerMediaId };

							if (
								(headerType === 'image_link' && !headerLink) ||
								(headerType === 'image_id' && !headerMediaId)
							) {
								throw new Error('Carousel card header image value is required');
							}

							components.push({
								type: 'header',
								parameters: [
									{
										type: 'image',
										image,
									},
								],
							});
						}

						const cardBodyRows = card.bodyParameters?.values ?? [];

						if (cardBodyRows.length) {
							components.push({
								type: 'body',
								parameters: cardBodyRows.map((row) => ({
									type: 'text',
									text: normalizeString(row.value) ?? '',
								})),
							});
						}

						const buttonPayload = normalizeString(card.buttonPayload);

						if (buttonPayload) {
							components.push({
								type: 'button',
								sub_type: 'quick_reply',
								index: '0',
								parameters: [
									{
										type: 'payload',
										payload: buttonPayload,
									},
								],
							});
						}

						return {
							card_index: String(cardIndex),
							components,
						};
					}),
				};
			}

			return {
				message_type: 'TEMPLATE',
				preview_url: $parameter.templatePreviewUrl,
				template: {
					template_id: templateId,
					language: templateLanguage,
					body_parameter_values: bodyParameterValues,
					media,
					limited_time_offer: limitedTimeOffer,
					buttons,
					carousel,
				},
			};
		}

		throw new Error('Unsupported message type');
	};

	return {
		messages: [
			{
				originator: $parameter.originator,
				content: buildContent(),
				recipients: [
					{
						recipient: $parameter.recipient,
						recipient_type: $parameter.recipientType,
					},
				],
				report_url: reportUrl,
			},
		],
	};
})() }}`;

export const whatsappDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForWhatsApp,
		},
		options: [
			{
				name: 'Download Media',
				value: 'downloadMedia',
				action: 'Download whatsapp media',
				description: 'Download media from WhatsApp by media ID',
				routing: {
					request: {
						method: 'GET',
						url: '=/whatsapp/v2/download/{{$parameter.mediaId}}',
					},
				},
			},
			{
				name: 'Get Status Report',
				value: 'getReport',
				action: 'Get a whatsapp status report',
				description: 'Get WhatsApp status report by request ID',
				routing: {
					request: {
						method: 'GET',
						url: '=/whatsapp/v2/report/{{$parameter.requestId}}',
					},
				},
			},
			{
				name: 'Read Receipts',
				value: 'readReceipts',
				action: 'Mark incoming messages as read',
				description: 'Mark incoming WhatsApp messages as read',
				routing: {
					request: {
						method: 'POST',
						url: '=/whatsapp/v2/read-receipt/{{$parameter.messageId}}',
						body: {
							typing: '={{$parameter.typing}}',
						},
					},
				},
			},
			{
				name: 'Send Message',
				value: 'send',
				action: 'Send a whatsapp message',
				description: 'Send a WhatsApp message via Direct7',
				routing: {
					request: {
						method: 'POST',
						url: '/whatsapp/v2/send',
						body: whatsappSendBody,
					},
				},
			},
		],
		default: 'send',
	},
	{
		displayName: 'Media ID',
		name: 'mediaId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: showOnlyForDownloadMedia,
		},
		description: 'Media ID to download from WhatsApp',
	},
	{
		displayName: 'Request ID',
		name: 'requestId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: showOnlyForWhatsAppGetReport,
		},
		description: 'Request ID returned when sending a WhatsApp message',
	},
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: showOnlyForReadReceipts,
		},
		description: 'Message ID returned when sending a WhatsApp message',
	},
	{
		displayName: 'Typing',
		name: 'typing',
		type: 'boolean',
		default: false,
		required: true,
		displayOptions: {
			show: showOnlyForReadReceipts,
		},
		description: 'Whether to show typing indicator',
	},
	{
		displayName: 'Originator',
		name: 'originator',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: showOnlyForWhatsAppSend,
		},
		description: 'Your registered WhatsApp phone number',
	},
	{
		displayName: 'Recipient',
		name: 'recipient',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: showOnlyForWhatsAppSend,
		},
		description: 'Recipient phone number in international format',
	},
	{
		displayName: 'Recipient Type',
		name: 'recipientType',
		type: 'options',
		options: [
			{
				name: 'Individual',
				value: 'individual',
			},
		],
		default: 'individual',
		displayOptions: {
			show: showOnlyForWhatsAppSend,
		},
	},
	{
		displayName: 'Message Type',
		name: 'messageType',
		type: 'options',
		options: [
			{
				name: 'Attachment',
				value: 'ATTACHMENT',
			},
			{
				name: 'Contacts',
				value: 'CONTACTS',
			},
			{
				name: 'Interactive',
				value: 'INTERACTIVE',
			},
			{
				name: 'Location',
				value: 'LOCATION',
			},
			{
				name: 'Template',
				value: 'TEMPLATE',
			},
			{
				name: 'Text',
				value: 'TEXT',
			},
		],
		default: 'TEXT',
		displayOptions: {
			show: showOnlyForWhatsAppSend,
		},
	},
	{
		displayName: 'Message Body',
		name: 'messageBody',
		type: 'string',
		typeOptions: {
			rows: 3,
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['TEXT'],
			},
		},
	},
	{
		displayName: 'Preview URL',
		name: 'previewUrl',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['TEXT'],
			},
		},
	},
	{
		displayName: 'Attachment Type',
		name: 'attachmentType',
		type: 'options',
		options: [
			{
				name: 'Audio',
				value: 'audio',
			},
			{
				name: 'Document',
				value: 'document',
			},
			{
				name: 'Image',
				value: 'image',
			},
			{
				name: 'Sticker',
				value: 'sticker',
			},
			{
				name: 'Video',
				value: 'video',
			},
		],
		default: 'image',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['ATTACHMENT'],
			},
		},
	},
	{
		displayName: 'Attachment URL',
		name: 'attachmentUrl',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://example.com/file.jpg',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['ATTACHMENT'],
			},
		},
		description: 'Public URL of the attachment file',
	},
	{
		displayName: 'Attachment Caption',
		name: 'attachmentCaption',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['ATTACHMENT'],
				attachmentType: ['document', 'image', 'video'],
			},
		},
		description: 'Optional caption for the attachment',
	},
	{
		displayName: 'Longitude',
		name: 'locationLongitude',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['LOCATION'],
			},
		},
	},
	{
		displayName: 'Latitude',
		name: 'locationLatitude',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['LOCATION'],
			},
		},
	},
	{
		displayName: 'Location Name',
		name: 'locationName',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['LOCATION'],
			},
		},
	},
	{
		displayName: 'Location Address',
		name: 'locationAddress',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['LOCATION'],
			},
		},
	},
	{
		displayName: 'Contacts',
		name: 'contacts',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Contact',
		default: {},
		required: true,
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['CONTACTS'],
			},
		},
		options: [
			{
				name: 'values',
				displayName: 'Contact',
				values: [
					{
						displayName: 'Birthday',
						name: 'birthday',
						type: 'string',
						default: '',
						placeholder: '1994-12-12',
					},
					{
						displayName: 'Emails',
						name: 'emails',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						placeholder: 'Add Email',
						default: {},
						options: [
							{
								name: 'values',
								displayName: 'Email',
								values: [
									{
										displayName: 'Email',
										name: 'email',
										type: 'string',
										default: '',
										placeholder: 'name@email.com',
									},
								],
							},
						],
					},
					{
						displayName: 'First Name',
						name: 'firstName',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Formatted Name',
						name: 'formattedName',
						type: 'string',
						default: '',
						description: 'Defaults to first name when empty',
					},
					{
						displayName: 'Last Name',
						name: 'lastName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Phones',
						name: 'phones',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						placeholder: 'Add Phone',
						default: {},
						required: true,
						options: [
							{
								name: 'values',
								displayName: 'Phone',
								values: [
									{
										displayName: 'Phone',
										name: 'phone',
										type: 'string',
										required: true,
										default: '',
									},
								],
							},
						],
					},
					{
						displayName: 'URLs',
						name: 'urls',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						placeholder: 'Add URL',
						default: {},
						options: [
							{
								name: 'values',
								displayName: 'URL',
								values: [
									{
										displayName: 'URL',
										name: 'url',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
				],
			},
		],
		description: 'Add up to 10 contacts',
	},
	{
		displayName: 'Interactive Type',
		name: 'interactiveType',
		type: 'options',
		options: [
			{
				name: 'CTA URL',
				value: 'cta_url',
			},
			{
				name: 'Button',
				value: 'button',
			},
			{
				name: 'List',
				value: 'list',
			},
			{
				name: 'Location Request',
				value: 'location_request_message',
			},
		],
		default: 'cta_url',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['INTERACTIVE'],
			},
		},
	},
	{
		displayName: 'Interactive Header Type',
		name: 'interactiveHeaderType',
		type: 'options',
		options: [
			{
				name: 'Document',
				value: 'document',
			},
			{
				name: 'Image',
				value: 'image',
			},
			{
				name: 'None',
				value: 'none',
			},
			{
				name: 'Text',
				value: 'text',
			},
			{
				name: 'Video',
				value: 'video',
			},
		],
		default: 'none',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['INTERACTIVE'],
				interactiveType: ['cta_url', 'button', 'list'],
			},
		},
	},
	{
		displayName: 'Interactive Header Text',
		name: 'interactiveHeaderText',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['INTERACTIVE'],
				interactiveType: ['cta_url', 'button', 'list'],
				interactiveHeaderType: ['text'],
			},
		},
	},
	{
		displayName: 'Interactive Header Media URL',
		name: 'interactiveHeaderMediaUrl',
		type: 'string',
		default: '',
		placeholder: 'https://example.com/file.jpg',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['INTERACTIVE'],
				interactiveType: ['cta_url', 'button', 'list'],
				interactiveHeaderType: ['image', 'video', 'document'],
			},
		},
	},
	{
		displayName: 'Interactive Body Text',
		name: 'interactiveBodyText',
		type: 'string',
		typeOptions: {
			rows: 3,
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['INTERACTIVE'],
			},
		},
		description: 'Required for all interactive types, including Location Request',
	},
	{
		displayName: 'Interactive Footer Text',
		name: 'interactiveFooterText',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['INTERACTIVE'],
				interactiveType: ['cta_url', 'button', 'list'],
			},
		},
	},
	{
		displayName: 'CTA Display Text',
		name: 'interactiveCtaDisplayText',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['INTERACTIVE'],
				interactiveType: ['cta_url'],
			},
		},
	},
	{
		displayName: 'CTA URL',
		name: 'interactiveCtaUrl',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['INTERACTIVE'],
				interactiveType: ['cta_url'],
			},
		},
	},
	{
		displayName: 'Interactive Buttons',
		name: 'interactiveButtons',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			maxValue: 3,
		},
		placeholder: 'Add Button',
		default: {},
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['INTERACTIVE'],
				interactiveType: ['button'],
			},
		},
		options: [
			{
				name: 'values',
				displayName: 'Button',
				values: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						required: true,
						default: '',
					},
				],
			},
		],
		description: 'Maximum 3 buttons',
	},
	{
		displayName: 'List Button Text',
		name: 'interactiveListButtonText',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['INTERACTIVE'],
				interactiveType: ['list'],
			},
		},
	},
	{
		displayName: 'List Sections',
		name: 'interactiveListSections',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Section',
		default: {},
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['INTERACTIVE'],
				interactiveType: ['list'],
			},
		},
		options: [
			{
				name: 'values',
				displayName: 'Section',
				values: [
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Rows',
						name: 'rows',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						placeholder: 'Add Row',
						default: {},
						required: true,
						options: [
							{
								name: 'values',
								displayName: 'Row',
								values: [
									{
										displayName: 'ID',
										name: 'id',
										type: 'string',
										required: true,
										default: '',
									},
									{
										displayName: 'Title',
										name: 'title',
										type: 'string',
										required: true,
										default: '',
									},
									{
										displayName: 'Description',
										name: 'description',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
				],
			},
		],
		description: 'Maximum 10 rows across all sections. IDs and titles must each be unique across the whole list.',
	},
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['TEMPLATE'],
			},
		},
	},
	{
		displayName: 'Template Language',
		name: 'templateLanguage',
		type: 'string',
		required: true,
		default: 'en',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['TEMPLATE'],
			},
		},
		description: 'Language code of the template, e.g. en',
	},
	{
		displayName: 'Preview URL',
		name: 'templatePreviewUrl',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['TEMPLATE'],
			},
		},
	},
	{
		displayName: 'Body Parameters',
		name: 'templateBodyParameters',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Parameter',
		default: {},
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['TEMPLATE'],
			},
		},
		options: [
			{
				name: 'values',
				displayName: 'Parameter',
				values: [
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
		description: 'Values are mapped to the template placeholders in order (0, 1, 2, ...)',
	},
	{
		displayName: 'Media Type',
		name: 'templateMediaType',
		type: 'options',
		options: [
			{
				name: 'Image',
				value: 'image',
			},
			{
				name: 'Location',
				value: 'location',
			},
			{
				name: 'None',
				value: 'none',
			},
			{
				name: 'Text',
				value: 'text',
			},
			{
				name: 'Video',
				value: 'video',
			},
		],
		default: 'none',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['TEMPLATE'],
			},
		},
	},
	{
		displayName: 'Text Header Title',
		name: 'templateMediaTextHeaderTitle',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['TEMPLATE'],
				templateMediaType: ['text'],
			},
		},
	},
	{
		displayName: 'Media URL',
		name: 'templateMediaUrl',
		type: 'string',
		default: '',
		placeholder: 'https://example.com/file.jpg',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['TEMPLATE'],
				templateMediaType: ['image', 'video'],
			},
		},
	},
	{
		displayName: 'Latitude',
		name: 'templateMediaLocationLatitude',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['TEMPLATE'],
				templateMediaType: ['location'],
			},
		},
	},
	{
		displayName: 'Longitude',
		name: 'templateMediaLocationLongitude',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['TEMPLATE'],
				templateMediaType: ['location'],
			},
		},
	},
	{
		displayName: 'Location Name',
		name: 'templateMediaLocationName',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['TEMPLATE'],
				templateMediaType: ['location'],
			},
		},
	},
	{
		displayName: 'Location Address',
		name: 'templateMediaLocationAddress',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['TEMPLATE'],
				templateMediaType: ['location'],
			},
		},
	},
	{
		displayName: 'Enable Limited Time Offer',
		name: 'templateEnableLimitedTimeOffer',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['TEMPLATE'],
			},
		},
	},
	{
		displayName: 'Expiration Time (Ms)',
		name: 'templateLimitedTimeOfferExpiration',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['TEMPLATE'],
				templateEnableLimitedTimeOffer: [true],
			},
		},
		description: 'Expiration time as a Unix timestamp in milliseconds',
	},
	{
		displayName: 'Buttons Type',
		name: 'templateButtonsType',
		type: 'options',
		options: [
			{
				name: 'Coupon Code',
				value: 'coupon_code',
			},
			{
				name: 'Dynamic URL Action',
				value: 'actions',
			},
			{
				name: 'Flow',
				value: 'button_flow',
			},
			{
				name: 'None',
				value: 'none',
			},
			{
				name: 'Quick Replies',
				value: 'quick_replies',
			},
		],
		default: 'none',
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['TEMPLATE'],
			},
		},
	},
	{
		displayName: 'Quick Reply Buttons',
		name: 'templateQuickReplyButtons',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Button',
		default: {},
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['TEMPLATE'],
				templateButtonsType: ['quick_replies'],
			},
		},
		options: [
			{
				name: 'values',
				displayName: 'Button',
				values: [
					{
						displayName: 'Button Index',
						name: 'buttonIndex',
						type: 'string',
						default: '',
						description: 'Leave empty to use the button position automatically',
					},
					{
						displayName: 'Button Payload',
						name: 'payload',
						type: 'string',
						required: true,
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Action Buttons',
		name: 'templateActionButtons',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Action',
		default: {},
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['TEMPLATE'],
				templateButtonsType: ['actions'],
			},
		},
		options: [
			{
				name: 'values',
				displayName: 'Action',
				values: [
					{
						displayName: 'Action Index',
						name: 'actionIndex',
						type: 'string',
						default: '',
						description: 'Leave empty to use the action position automatically',
					},
					{
						displayName: 'Action Type',
						name: 'actionType',
						type: 'string',
						default: 'url',
					},
					{
						displayName: 'Action Payload',
						name: 'payload',
						type: 'string',
						required: true,
						default: '',
						description: 'E.g. the dynamic value appended to the template button URL.',
					},
				],
			},
		],
	},
	{
		displayName: 'Coupon Code Buttons',
		name: 'templateCouponButtons',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Coupon',
		default: {},
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['TEMPLATE'],
				templateButtonsType: ['coupon_code'],
			},
		},
		options: [
			{
				name: 'values',
				displayName: 'Coupon',
				values: [
					{
						displayName: 'Index',
						name: 'index',
						type: 'number',
						default: 0,
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'string',
						default: 'copy_code',
					},
					{
						displayName: 'Coupon Code',
						name: 'couponCode',
						type: 'string',
						required: true,
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Flow Buttons',
		name: 'templateFlowButtons',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Flow Button',
		default: {},
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['TEMPLATE'],
				templateButtonsType: ['button_flow'],
			},
		},
		options: [
			{
				name: 'values',
				displayName: 'Flow Button',
				values: [
					{
						displayName: 'Flow Token',
						name: 'flowToken',
						type: 'string',
						typeOptions: { password: true },
						default: 'unused',
					},
					{
						displayName: 'Action Type',
						name: 'actionType',
						type: 'string',
						default: 'flow',
					},
					{
						displayName: 'Index',
						name: 'index',
						type: 'string',
						default: '',
						description: 'Leave empty to use the button position automatically',
					},
					{
						displayName: 'Flow Action Data (JSON)',
						name: 'flowActionData',
						type: 'json',
						default: '{}',
					},
				],
			},
		],
	},
	{
		displayName: 'Use Carousel',
		name: 'templateUseCarousel',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['TEMPLATE'],
			},
		},
	},
	{
		displayName: 'Carousel Cards',
		name: 'templateCarouselCards',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Card',
		default: {},
		displayOptions: {
			show: {
				...showOnlyForWhatsAppSend,
				messageType: ['TEMPLATE'],
				templateUseCarousel: [true],
			},
		},
		options: [
			{
				name: 'values',
				displayName: 'Card',
				values: [
					{
						displayName: 'Body Parameters',
						name: 'bodyParameters',
						type: 'fixedCollection',
						default: {},
						placeholder: 'Add Parameter',
						options: [
							{
								name: 'values',
								displayName: 'Parameter',
									values:	[
											{
												displayName: 'Value',
												name: 'value',
												type: 'string',
												default: '',
											},
										]
							},
					]
					},
					{
						displayName: 'Button Payload',
						name: 'buttonPayload',
						type: 'string',
						default: '',
						description: 'Quick reply payload for this card\'s button (index 0), leave empty if none',
					},
					{
						displayName: 'Header Image Media ID',
						name: 'headerImageId',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Header Image URL',
						name: 'headerImageUrl',
						type: 'string',
						default: '',
						placeholder: 'https://example.com/file.jpg',
					},
					{
						displayName: 'Header Type',
						name: 'headerType',
						type: 'options',
						options: [
							{
								name: 'None',
								value: 'none',
							},
							{
								name: 'Image URL',
								value: 'image_link',
							},
							{
								name: 'Image Media ID',
								value: 'image_id',
							},
					],
						default: 'none',
					},
			],
			},
		],
		description: 'Each card maps to a carousel card, in order (card_index 0, 1, 2, ...)',
	},
	{
		displayName: 'Report URL',
		name: 'reportUrl',
		type: 'string',
		default: '',
		placeholder: 'URL to receive Delivery reports',
		displayOptions: {
			show: showOnlyForWhatsAppSend,
		},
		description: 'Webhook URL to receive delivery reports',
	},
];