import type { LayoutData } from './$types';

// Temp / placeholder / testing
export const load: LayoutData = () => {
	return {
		foo: [
			{ slug: 'profile', title: 'Profile' },
			{ slug: 'notifications', title: 'Notifications' }
		]
	};
};
