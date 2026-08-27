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
        (file) => file.type.startsWith('image/'),
        'thumbDropLabel'
    );

    function setupFileDrop(dropId, inputName, validator, labelId) {
        const drop = document.getElementById(dropId);
        if (!drop) return;

        const input = drop.querySelector(`input[name="${inputName}"]`);
        const label = document.getElementById(labelId);

        ['dragenter', 'dragover'].forEach((evt) => {
            drop.addEventListener(evt, (e) => {
                e.preventDefault();
                drop.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach((evt) => {
            drop.addEventListener(evt, (e) => {
                e.preventDefault();
                drop.classList.remove('dragover');
            });
        });

        drop.addEventListener('drop', (e) => {
            const file = e.dataTransfer.files[0];

            if (file && validator(file)) {
                try {
                    input.files = e.dataTransfer.files;
                    updateLabel(file);
                } catch (err) {
                    console.error('Unable to set selected file:', err);
                }
            } else if (file) {
                showToast('Invalid file type for this field.', 'error');
            }
        });

        input.addEventListener('change', () => {
            if (input.files[0]) {
                updateLabel(input.files[0]);
            }
        });

        function updateLabel(file) {
            if (label) {
                label.textContent =
                    `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
            }
        }
    }

    const uploadForm = document.getElementById('uploadForm');

    if (!uploadForm) return;

    // ------------------------------------------------------------
    // Get Cloudinary signature
    // ------------------------------------------------------------
    async function getCloudinarySignature(resourceType, csrfToken) {
        const response = await fetch('/api/cloudinary/upload-signature', {
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
        });

        const text = await response.text();

        let data;

        try {
            data = JSON.parse(text);
        } catch (err) {
            console.error('Invalid signature response:', text);
            throw new Error('Server returned an invalid Cloudinary response.');
        }

        if (!response.ok || !data.success) {
            throw new Error(
                data.error ||
                `Could not prepare Cloudinary upload (${response.status}).`
            );
        }

        return data;
    }

    // ------------------------------------------------------------
    // Upload directly to Cloudinary
    // ------------------------------------------------------------
    async function uploadToCloudinary(file, resourceType, signatureData) {
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
            cloudName: signatureData.cloudName
        });

        const response = await fetch(cloudinaryUrl, {
            method: 'POST',
            body: formData
        });

        const text = await response.text();

        let result;

        try {
            result = JSON.parse(text);
        } catch (err) {
            console.error('Invalid Cloudinary response:', text);
            throw new Error('Cloudinary returned an invalid response.');
        }

        if (!response.ok || !result.secure_url) {
            console.error('Cloudinary upload failed:', result);

            throw new Error(
                result.error?.message ||
                `Cloudinary upload failed (${response.status}).`
            );
        }

        return result;
    }

    // ------------------------------------------------------------
    // Submit upload form
    // ------------------------------------------------------------
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const pdfInput =
            uploadForm.querySelector('input[name="pdf"]');

        const thumbnailInput =
            uploadForm.querySelector('input[name="thumbnail"]');

        if (!pdfInput?.files?.[0]) {
            showToast('Please select a PDF file to upload.', 'error');
            return;
        }

        const pdfFile = pdfInput.files[0];

        // --------------------------------------------------------
        // Validate PDF
        // --------------------------------------------------------
        if (pdfFile.type !== 'application/pdf') {
            showToast('Only PDF files are allowed.', 'error');
            return;
        }

        const maxPdfSize = 100 * 1024 * 1024;

        if (pdfFile.size > maxPdfSize) {
            showToast('PDF must be 100MB or smaller.', 'error');
            return;
        }

        // --------------------------------------------------------
        // Validate thumbnail
        // --------------------------------------------------------
        const thumbnailFile =
            thumbnailInput?.files?.[0] || null;

        if (thumbnailFile) {
            const maxThumbSize = 3 * 1024 * 1024;

            if (thumbnailFile.size > maxThumbSize) {
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

        submitBtn.disabled = true;

        try {
            // ----------------------------------------------------
            // CSRF
            // ----------------------------------------------------
            const csrfInput =
                uploadForm.querySelector('input[name="_csrf"]');

            const csrfToken =
                csrfInput ? csrfInput.value : '';

            if (!csrfToken) {
                throw new Error(
                    'Security token missing. Please refresh the page and try again.'
                );
            }

            // ----------------------------------------------------
            // 1. Get PDF signature
            // ----------------------------------------------------
            submitBtn.innerHTML = 'Preparing PDF upload...';

            const pdfSignature =
                await getCloudinarySignature(
                    'raw',
                    csrfToken
                );

            // ----------------------------------------------------
            // 2. Upload PDF directly to Cloudinary
            // ----------------------------------------------------
            submitBtn.innerHTML = 'Uploading PDF...';

            const pdfResult =
                await uploadToCloudinary(
                    pdfFile,
                    'raw',
                    pdfSignature
                );

            const pdfUrl = pdfResult.secure_url;

            console.log('PDF uploaded successfully:', pdfUrl);

            // ----------------------------------------------------
            // 3. Upload thumbnail if provided
            // ----------------------------------------------------
            let thumbnailUrl = '';

            if (thumbnailFile) {
                submitBtn.innerHTML =
                    'Preparing thumbnail upload...';

                const thumbSignature =
                    await getCloudinarySignature(
                        'image',
                        csrfToken
                    );

                submitBtn.innerHTML =
                    'Uploading thumbnail...';

                const thumbResult =
                    await uploadToCloudinary(
                        thumbnailFile,
                        'image',
                        thumbSignature
                    );

                thumbnailUrl =
                    thumbResult.secure_url;

                console.log(
                    'Thumbnail uploaded successfully:',
                    thumbnailUrl
                );
            }

            // ----------------------------------------------------
            // 4. Send only text + Cloudinary URLs to Vercel
            // ----------------------------------------------------
            submitBtn.innerHTML = 'Saving note...';

            const formData =
                new FormData(uploadForm);

            // Never send the actual files to Vercel.
            formData.delete('pdf');
            formData.delete('thumbnail');

            formData.append(
                'pdf_path',
                pdfUrl
            );

            formData.append(
                'thumbnail',
                thumbnailUrl
            );

            // ----------------------------------------------------
            // 5. Save note in MySQL
            // ----------------------------------------------------
            const saveResponse =
                await fetch('/upload', {
                    method: 'POST',
                    body: formData,
                    credentials: 'same-origin'
                });

            if (!saveResponse.ok) {
                const text =
                    await saveResponse.text();

                console.error(
                    'Save note failed:',
                    saveResponse.status,
                    text
                );

                throw new Error(
                    'The file uploaded, but the note could not be saved.'
                );
            }

            // The server returns a redirect.
            window.location.href =
                saveResponse.url;

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

            submitBtn.disabled = false;

            submitBtn.innerHTML = `
                <svg width="17" height="17"
                     viewBox="0 0 24 24"
                     fill="none">
                    <path
                        d="M12 4v13m0 0l-4.5-4.5M12 17l4.5-4.5M4 21h16"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"/>
                </svg>
                Upload Note &amp; Earn 5 Credits
            `;
        }
    });
});
