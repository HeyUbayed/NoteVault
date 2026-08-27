document.addEventListener('DOMContentLoaded', () => {
    // ------------------------------------------------------------
    // Tabs
    // ------------------------------------------------------------
    const tabBtns = document.querySelectorAll('.tab-btn');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            document
                .querySelectorAll('.tab-btn')
                .forEach(b => b.classList.remove('active'));

            document
                .querySelectorAll('.tab-panel')
                .forEach(p => p.classList.remove('active'));

            btn.classList.add('active');

            const panel = document.getElementById(btn.dataset.tab);

            if (panel) {
                panel.classList.add('active');
            }
        });
    });

    // ------------------------------------------------------------
    // Avatar upload
    // ------------------------------------------------------------
    const avatarInput = document.getElementById('avatarInput');

    if (avatarInput) {
        avatarInput.addEventListener('change', async () => {
            const file = avatarInput.files[0];

            if (!file) {
                return;
            }

            // ----------------------------------------------------
            // Validate file type
            // ----------------------------------------------------
            const allowedTypes = [
                'image/jpeg',
                'image/png',
                'image/webp'
            ];

            if (!allowedTypes.includes(file.type)) {
                showToast(
                    'Only JPG, PNG, or WEBP images are allowed.',
                    'error'
                );

                avatarInput.value = '';
                return;
            }

            // ----------------------------------------------------
            // Validate file size
            // ----------------------------------------------------
            const maxSize = 3 * 1024 * 1024;

            if (file.size > maxSize) {
                showToast(
                    'Profile image must be 3MB or smaller.',
                    'error'
                );

                avatarInput.value = '';
                return;
            }

            try {
                showToast(
                    'Uploading profile image...',
                    'success'
                );

                avatarInput.disabled = true;

                // ------------------------------------------------
                // Get Cloudinary upload signature
                // ------------------------------------------------
                const signatureResponse = await csrfFetch(
                    '/api/cloudinary/upload-signature',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            resourceType: 'image'
                        })
                    }
                );

                const signatureData =
                    await signatureResponse.json();

                if (
                    !signatureResponse.ok ||
                    !signatureData.success
                ) {
                    throw new Error(
                        signatureData.message ||
                        'Could not prepare image upload.'
                    );
                }

                // ------------------------------------------------
                // Upload image directly to Cloudinary
                // ------------------------------------------------
                const cloudinaryFormData = new FormData();

                cloudinaryFormData.append(
                    'file',
                    file
                );

                cloudinaryFormData.append(
                    'api_key',
                    signatureData.apiKey
                );

                cloudinaryFormData.append(
                    'timestamp',
                    signatureData.timestamp
                );

                cloudinaryFormData.append(
                    'signature',
                    signatureData.signature
                );

                cloudinaryFormData.append(
                    'folder',
                    signatureData.folder
                );

                const cloudinaryResponse = await fetch(
                    `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`,
                    {
                        method: 'POST',
                        body: cloudinaryFormData
                    }
                );

                const cloudinaryData =
                    await cloudinaryResponse.json();

                if (
                    !cloudinaryResponse.ok ||
                    !cloudinaryData.secure_url
                ) {
                    throw new Error(
                        cloudinaryData.error?.message ||
                        'Cloudinary image upload failed.'
                    );
                }

                // ------------------------------------------------
                // Send Cloudinary URL to our backend
                // ------------------------------------------------
                const saveResponse = await csrfFetch(
                    '/profile/image',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            profile_image_url:
                                cloudinaryData.secure_url
                        })
                    }
                );

                if (!saveResponse.ok) {
                    throw new Error(
                        'Could not save profile image.'
                    );
                }

                showToast(
                    'Profile image updated successfully.',
                    'success'
                );

                // ------------------------------------------------
                // Refresh profile page
                // ------------------------------------------------
                window.location.href =
                    '/profile?updated=1';

            } catch (err) {
                console.error(
                    'Profile image upload error:',
                    err
                );

                showToast(
                    err.message ||
                    'Something went wrong while uploading the image.',
                    'error'
                );

                avatarInput.value = '';
            } finally {
                avatarInput.disabled = false;
            }
        });
    }

    // ------------------------------------------------------------
    // Password change
    // ------------------------------------------------------------
    const pwForm =
        document.getElementById('passwordChangeForm');

    if (pwForm) {
        pwForm.addEventListener(
            'submit',
            async (e) => {
                e.preventDefault();

                const formData =
                    new FormData(pwForm);

                const body =
                    Object.fromEntries(
                        formData.entries()
                    );

                const btn =
                    pwForm.querySelector(
                        'button[type="submit"]'
                    );

                btn.disabled = true;

                try {
                    const res = await csrfFetch(
                        '/profile/password',
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type':
                                    'application/json'
                            },
                            body: JSON.stringify(body)
                        }
                    );

                    const data =
                        await res.json();

                    showToast(
                        data.message,
                        data.success
                            ? 'success'
                            : 'error'
                    );

                    if (data.success) {
                        pwForm.reset();
                    }
                } catch (err) {
                    console.error(
                        'Password change error:',
                        err
                    );

                    showToast(
                        'Something went wrong.',
                        'error'
                    );
                }

                btn.disabled = false;
            }
        );
    }
});
