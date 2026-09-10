const form = document.getElementById('loginForm');
const error = document.getElementById('error-message');

form.addEventListener('submit', function(event) {
	event.preventDefault();	
	const formData = new FormData(form);
	const email = formData.get('email');
	const pass = formData.get('password');

	fetch('/api/login', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ email: email, password: pass })
	}).then((resp) => {
		if (resp.status === 200) window.location.href = '/';
		else if (resp.status === 401) {
			error.textContent = 'Invalid email or password.';
			error.style.display = 'block';
		}
	});
});