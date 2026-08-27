document.addEventListener('DOMContentLoaded', () => {
    setupFileDrop(
        'pdfDrop',
        'pdf',
        (file) => file.type === 'application/pdf',
        'pdfDropLabel'
    );

    setupFileDrop(
        'thumbDrop',
        'thumbnail',
        (file) => {
            const allowed = [
                'image/jpeg',
                'image/png',
                'image/webp'
            ];
            return allowed.includes(file.type);
        },
        'thumbDropLabel'
    );

    function setupFileDrop(dropId, inputName, validator, labelId) {
        const drop = document.getElementById(dropId);
        if (!drop) return;

        const input = drop.querySelector(`input[name="${inputName}"]`);
        const label = document.getElementById(labelId);

        if (!input) return;

        ['dragenter', 'dragover'].forEach((eventName) => {
            drop.addEventListener(eventName, (event) => {
                event.preventDefault();
                event.stopPropagation();
                drop.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach((eventName) => {
            drop.addEventListener(eventName, (event) => {
                event.preventDefault();
                event.stopPropagation();
                drop.classList.remove('dragover');
            });
        });

        drop.addEventListener('drop', (event) => {
            const files = event.dataTransfer.files;

            if (!files || !files.length) return;

            const file = files[0];

            if (!validator(file)) {
                showToast('Invalid file type for this field.', 'error');
                return;
            }

            try {
                input.files = files;
                updateLabel(file);
            } catch (error) {
                console.error('Could not set dropped file:', error);
            }
        });

        input.addEventListener('change', () => {
            if (!input.files || !input.files.length) return;

            const file = input.files[0];

            if (!validator(file)) {
                input.value = '';
                showToast('Invalid file type for this field.', 'error');
                return;
            }

            updateLabel(file);
        });

        function updateLabel(file) {
            if (!label) return;

            const sizeMB = file.size / (1024 * 1024);

            label.textContent =
                `${file.name} (${sizeMB.toFixed(2)} MB)`;
        }
    }

    const uploadForm = document.getElementById('uploadForm');

    if (!uploadForm) return;

    async function getCloudinarySignature(resourceType, csrfToken) {
        const response = await fetch(
            '/api/cloudinary/upload-signature',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken,
                    'Accept': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    resourceType
                })
            }
        );

        const responseText = await response.text();

        let data;

        try {
            data = JSON.parse(responseText);
        } catch (error) {
            console.error('Invalid signature response:', responseText);
            throw new Error(
                'The server returned an invalid Cloudinary response.'
            );
        }

        if (!response.ok || !data.success) {
            throw new Error(
                data.error ||
                `Could not prepare Cloudinary upload (${response.status}).`
            );
        }

        if (
            !data.cloudName ||
            !data.apiKey ||
            !data.timestamp ||
            !data.signature ||
            !data.folder
        ) {
            throw new Error(
                'Cloudinary upload configuration is incomplete.'
            );
        }

        return data;
    }

    async function uploadToCloudinary(
        file,
        resourceType,
        signatureData
    ) {
        const formData = new FormData();

        formData.append('file', file);
        formData.append('api_key', signatureData.apiKey);
        formData.append('timestamp', String(signatureData.timestamp));
        formData.append('signature', signatureData.signature);
        formData.append('folder', signatureData.folder);

        const cloudinaryUrl =
            `https://api.cloudinary.com/v1_1/` +
            `${encodeURIComponent(signatureData.cloudName)}/` +
            `${resourceType}/upload`;

        console.log('Uploading to Cloudinary:', {
            resourceType,
            folder: signatureData.folder,
            fileName: file.name,
            fileSize: file.size
        });

        let response;

        try {
            response = await fetch(cloudinaryUrl, {
                method: 'POST',
                body: formData
            });
        } catch (error) {
            console.error('Cloudinary network error:', error);

            throw new Error(
                'Failed to connect to Cloudinary. Check your Cloudinary configuration and browser console.'
            );
        }

        const responseText = await response.text();

        let result;

        try {
            result = JSON.parse(responseText);
        } catch (error) {
            console.error('Invalid Cloudinary response:', responseText);

            throw new Error(
                'Cloudinary returned an invalid response.'
            );
        }

        if (!response.ok) {
            console.error('Cloudinary upload failed:', {
                status: response.status,
                result
            });

            throw new Error(
                result.error?.message ||
                `Cloudinary upload failed (${response.status}).`
            );
        }

        if (!result.secure_url) {
            throw new Error(
                'Cloudinary did not return a file URL.'
            );
        }

        console.log(
            'Cloudinary upload successful:',
            result.secure_url
        );

        return result;
    }

    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const pdfInput =
            uploadForm.querySelector('input[name="pdf"]');

        const thumbnailInput =
            uploadForm.querySelector('input[name="thumbnail"]');

        if (
            !pdfInput ||
            !pdfInput.files ||
            !pdfInput.files[0]
        ) {
            showToast(
                'Please select a PDF file to upload.',
                'error'
            );
            return;
        }

        const pdfFile = pdfInput.files[0];

        if (pdfFile.type !== 'application/pdf') {
            showToast(
                'Only PDF files are allowed.',
                'error'
            );
            return;
        }

        const MAX_PDF_SIZE = 100 * 1024 * 1024;

        if (pdfFile.size > MAX_PDF_SIZE) {
            showToast(
                'PDF must be 100MB or smaller.',
                'error'
            );
            return;
        }

        const thumbnailFile =
            thumbnailInput &&
            thumbnailInput.files &&
            thumbnailInput.files[0]
                ? thumbnailInput.files[0]
                : null;

        if (thumbnailFile) {
            const MAX_THUMB_SIZE = 3 * 1024 * 1024;

            if (thumbnailFile.size > MAX_THUMB_SIZE) {
                showToast(
                    'Thumbnail must be 3MB or smaller.',
                    'error'
                );
                return;
            }

            const allowedImageTypes = [
                'image/jpeg',
                'image/png',
                'image/webp'
            ];

            if (!allowedImageTypes.includes(thumbnailFile.type)) {
                showToast(
                    'Thumbnail must be JPG, PNG, or WEBP.',
                    'error'
                );
                return;
            }
        }

        const submitBtn =
            uploadForm.querySelector('button[type="submit"]');

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Preparing upload...';
        }

        try {
            const csrfInput =
                uploadForm.querySelector('input[name="_csrf"]');

            const csrfToken =
                csrfInput ? csrfInput.value : '';

            if (!csrfToken) {
                throw new Error(
                    'Security token missing. Refresh the page and try again.'
                );
            }

            // Upload PDF directly to Cloudinary
            if (submitBtn) {
                submitBtn.textContent =
                    'Preparing PDF upload...';
            }

            const pdfSignature =
                await getCloudinarySignature(
                    'raw',
                    csrfToken
                );

            if (submitBtn) {
                submitBtn.textContent =
                    'Uploading PDF...';
            }

            const pdfResult =
                await uploadToCloudinary(
                    pdfFile,
                    'raw',
                    pdfSignature
                );

            const pdfUrl =
                pdfResult.secure_url;

            // Upload thumbnail directly to Cloudinary
            let thumbnailUrl = '';

            if (thumbnailFile) {
                if (submitBtn) {
                    submitBtn.textContent =
                        'Preparing thumbnail upload...';
                }

                const thumbnailSignature =
                    await getCloudinarySignature(
                        'image',
                        csrfToken
                    );

                if (submitBtn) {
                    submitBtn.textContent =
                        'Uploading thumbnail...';
                }

                const thumbnailResult =
                    await uploadToCloudinary(
                        thumbnailFile,
                        'image',
                        thumbnailSignature
                    );

                thumbnailUrl =
                    thumbnailResult.secure_url;
            }

            // Send only normal form data + Cloudinary URLs to Vercel
            if (submitBtn) {
                submitBtn.textContent =
                    'Saving note...';
            }

            const formData =
                new FormData(uploadForm);

            // Do not send the actual files to Vercel
            formData.delete('pdf');
            formData.delete('thumbnail');

            formData.append(
                'pdf_path',
                pdfUrl
            );

            formData.append(
                'file_size',
                String(pdfFile.size)
            );

            formData.append(
                'thumbnail',
                thumbnailUrl
            );

            const saveResponse =
                await fetch('/upload', {
                    method: 'POST',
                    body: formData,
                    credentials: 'same-origin'
                });

            if (saveResponse.redirected) {
                window.location.href =
                    saveResponse.url;
                return;
            }

            if (!saveResponse.ok) {
                const responseText =
                    await saveResponse.text();

                console.error(
                    'Save note failed:',
                    responseText
                );

                throw new Error(
                    'The file uploaded, but the note could not be saved.'
                );
            }

            window.location.href =
                saveResponse.url || '/dashboard';

        } catch (error) {
            console.error(
                'Complete upload error:',
                error
            );

            showToast(
                error.message ||
                'Upload failed. Please try again.',
                'error'
            );

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent =
                    'Upload Note & Earn 5 Credits';
            }
        }
    });
});
