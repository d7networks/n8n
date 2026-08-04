import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

import { DIRECT7_BASE_URL } from '../nodes/Direct7/constants/EnvironmentalConf';

export class Direct7Api implements ICredentialType {
	name = 'direct7Api';

	displayName = 'Direct7 API';

	documentationUrl = 'https://docs.n8n.io/integrations/builtin/credentials/direct7/';

	icon: Icon = {
		light: 'file:../nodes/Direct7/direct7.svg',
		dark: 'file:../nodes/Direct7/direct7.dark.svg',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: DIRECT7_BASE_URL,
			url: '/auth/v1/authenticate/application/verify-token',
			method: 'GET',
		},
	};
}
