```js
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

            const panel = document.getElementById(
                btn.dataset.tab
            );

            if (panel) {
                panel.classList.add('active');
            }
        });
    });


    // ------------------------------------------------------------
    // Avatar upload
    // ------------------------------------------------------------
    const avatarInput =
        document.getElementById('avatarInput');

    if (avatarInput) {

        avatarInput.addEventListener(
            'change',
            async () => {

                const file =
                    avatarInput.files &&
                    avatarInput.files[0];

                if (!file) {
                    return;
                }


                // ------------------------------------------------
                // Validate file type
                // ------------------------------------------------
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


                // ------------------------------------------------
                // Validate file size
                // ------------------------------------------------
                const maxSize =
                    3 * 1024 * 1024;

                if (file.size > maxSize) {

                    showToast(
                        'Profile image must be 3MB or smaller.',
                        'error'
                    );

                    avatarInput.value = '';

                    return;
                }


                try {

                    avatarInput.disabled = true;

                    showToast(
                        'Preparing profile image upload...',
                        'success'
                    );


                    // ------------------------------------------------
                    // STEP 1:
                    // Get Cloudinary signature from backend
                    // ------------------------------------------------
                    const signatureResponse =
                        await csrfFetch(
                            '/api/cloudinary/upload-signature',
                            {
                                method: 'POST',

                                headers: {
                                    'Content-Type':
                                        'application/json',
                                    'Accept':
                                        'application/json'
                                },

                                body: JSON.stringify({
                                    resourceType: 'image'
                                })
                            }
                        );


                    const signatureText =
                        await signatureResponse.text();

                    let signatureData;

                    try {

                        signatureData =
                            JSON.parse(
                                signatureText
                            );

                    } catch (parseError) {

                        console.error(
                            'Invalid signature response:',
                            signatureText
                        );

                        throw new Error(
                            'Server returned an invalid upload response.'
                        );
                    }


                    if (
                        !signatureResponse.ok ||
                        !signatureData.success
                    ) {

                        throw new Error(
                            signatureData.message ||
                            signatureData.error ||
                            `Could not prepare image upload (${signatureResponse.status}).`
                        );
                    }


                    if (
                        !signatureData.cloudName ||
                        !signatureData.apiKey ||
                        !signatureData.timestamp ||
                        !signatureData.signature ||
                        !signatureData.folder
                    ) {

                        console.error(
                            'Incomplete Cloudinary signature:',
                            signatureData
                        );

                        throw new Error(
                            'Cloudinary configuration is incomplete.'
                        );
                    }


                    // ------------------------------------------------
                    // STEP 2:
                    // Upload image directly to Cloudinary
                    // ------------------------------------------------
                    showToast(
                        'Uploading profile image...',
                        'success'
                    );


                    const cloudinaryFormData =
                        new FormData();

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
                        String(
                            signatureData.timestamp
                        )
                    );

                    cloudinaryFormData.append(
                        'signature',
                        signatureData.signature
                    );

                    cloudinaryFormData.append(
                        'folder',
                        signatureData.folder
                    );


                    const cloudinaryUrl =
                        `https://api.cloudinary.com/v1_1/` +
                        `${encodeURIComponent(
                            signatureData.cloudName
                        )}/image/upload`;


                    let cloudinaryResponse;

                    try {

                        cloudinaryResponse =
                            await fetch(
                                cloudinaryUrl,
                                {
                                    method: 'POST',
                                    body:
                                        cloudinaryFormData
                                }
                            );

                    } catch (networkError) {

                        console.error(
                            'Cloudinary network error:',
                            networkError
                        );

                        throw new Error(
                            'Could not connect to Cloudinary.'
                        );
                    }


                    const cloudinaryText =
                        await cloudinaryResponse.text();

                    let cloudinaryData;

                    try {

                        cloudinaryData =
                            JSON.parse(
                                cloudinaryText
                            );

                    } catch (parseError) {

                        console.error(
                            'Invalid Cloudinary response:',
                            cloudinaryText
                        );

                        throw new Error(
                            'Cloudinary returned an invalid response.'
                        );
                    }


                    if (
                        !cloudinaryResponse.ok ||
                        !cloudinaryData.secure_url
                    ) {

                        console.error(
                            'Cloudinary upload failed:',
                            cloudinaryData
                        );

                        throw new Error(
                            cloudinaryData.error?.message ||
                            `Cloudinary upload failed (${cloudinaryResponse.status}).`
                        );
                    }


                    const imageUrl =
                        cloudinaryData.secure_url;


                    console.log(
                        'Cloudinary image uploaded:',
                        imageUrl
                    );


                    // ------------------------------------------------
                    // STEP 3:
                    // Save Cloudinary URL in MySQL through backend
                    // ------------------------------------------------
                    showToast(
                        'Saving profile image...',
                        'success'
                    );


                    const saveResponse =
                        await csrfFetch(
                            '/profile/image',
                            {
                                method: 'POST',

                                headers: {
                                    'Content-Type':
                                        'application/json',
                                    'Accept':
                                        'application/json'
                                },

                                body: JSON.stringify({
                                    profile_image_url:
                                        imageUrl
                                })
                            }
                        );


                    const saveText =
                        await saveResponse.text();

                    let saveData = {};

                    try {

                        if (saveText) {
                            saveData =
                                JSON.parse(
                                    saveText
                                );
                        }

                    } catch (parseError) {

                        // The backend may return HTML
                        // for a redirect/error.
                        console.warn(
                            'Profile save response was not JSON:',
                            saveText
                        );
                    }


                    if (!saveResponse.ok) {

                        console.error(
                            'Profile image save failed:',
                            {
                                status:
                                    saveResponse.status,
                                response:
                                    saveText
                            }
                        );

                        throw new Error(
                            saveData.message ||
                            'Could not save profile image.'
                        );
                    }


                    // ------------------------------------------------
                    // SUCCESS
                    // ------------------------------------------------
                    showToast(
                        'Profile image updated successfully.',
                        'success'
                    );


                    // Give the toast a moment to appear
                    setTimeout(() => {
                        window.location.href =
                            '/profile?updated=1';
                    }, 500);


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
            }
        );
    }


    // ------------------------------------------------------------
    // Password change
    // ------------------------------------------------------------
    const pwForm =
        document.getElementById(
            'passwordChangeForm'
        );

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

                if (btn) {
                    btn.disabled = true;
                }


                try {

                    const response =
                        await csrfFetch(
                            '/profile/password',
                            {
                                method: 'POST',

                                headers: {
                                    'Content-Type':
                                        'application/json',
                                    'Accept':
                                        'application/json'
                                },

                                body:
                                    JSON.stringify(
                                        body
                                    )
                            }
                        );


                    const text =
                        await response.text();

                    let data = {};

                    try {

                        data =
                            JSON.parse(text);

                    } catch (parseError) {

                        console.error(
                            'Invalid password response:',
                            text
                        );

                        throw new Error(
                            'Server returned an invalid response.'
                        );
                    }


                    showToast(
                        data.message ||
                        (
                            response.ok
                                ? 'Password updated successfully.'
                                : 'Password update failed.'
                        ),
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
                        err.message ||
                        'Something went wrong.',
                        'error'
                    );

                } finally {

                    if (btn) {
                        btn.disabled = false;
                    }
                }
            }
        );
    }

});
```
