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

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const pdfInput = uploadForm.querySelector('input[name="pdf"]');
        const thumbnailInput =
            uploadForm.querySelector('input[name="thumbnail"]');

        if (!pdfInput.files[0]) {
            showToast('Please select a PDF file to upload.', 'error');
            return;
        }

        const pdfFile = pdfInput.files[0];

        // ----------------------------------------------------
        // Client-side PDF validation
        // ----------------------------------------------------
        if (pdfFile.type !== 'application/pdf') {
            showToast('Only PDF files are allowed.', 'error');
            return;
        }

        const maxPdfSize = 100 * 1024 * 1024;

        if (pdfFile.size > maxPdfSize) {
            showToast('PDF must be 100MB or smaller.', 'error');
            return;
        }

        const submitBtn =
            uploadForm.querySelector('button[type="submit"]');

        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Preparing upload...';

        try {
            // ------------------------------------------------
            // Get Cloudinary upload information
            // ------------------------------------------------
            const csrfInput =
                uploadForm.querySelector('input[name="_csrf"]');

            const csrfToken = csrfInput ? csrfInput.value : '';

            const signatureResponse = await fetch(
                '/api/cloudinary/upload-signature',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({
                        resourceType: 'raw'
                    })
                }
            );

            const signatureData = await signatureResponse.json();

            if (!signatureResponse.ok) {
                throw new Error(
                    signatureData.error ||
                    'Could not prepare Cloudinary upload.'
                );
            }

            // ------------------------------------------------
            // Upload PDF DIRECTLY to Cloudinary
            // ------------------------------------------------
            submitBtn.innerHTML = 'Uploading PDF...';

            const pdfFormData = new FormData();

            pdfFormData.append('file', pdfFile);
            pdfFormData.append(
                'api_key',
                signatureData.apiKey
            );
            pdfFormData.append(
                'timestamp',
                signatureData.timestamp
            );
            pdfFormData.append(
                'signature',
                signatureData.signature
            );
            pdfFormData.append(
                'folder',
                signatureData.folder
            );

            const cloudinaryPdfUrl =
                `https://api.cloudinary.com/v1_1/${encodeURIComponent(
                    signatureData.cloudName
                )}/raw/upload`;

            const pdfResponse = await fetch(
                cloudinaryPdfUrl,
                {
                    method: 'POST',
                    body: pdfFormData
                }
            );

            const pdfResult = await pdfResponse.json();

            if (!pdfResponse.ok || !pdfResult.secure_url) {
                console.error('Cloudinary PDF error:', pdfResult);

                throw new Error(
                    pdfResult.error?.message ||
                    'PDF upload to Cloudinary failed.'
                );
            }

            // ------------------------------------------------
            // Upload thumbnail directly to Cloudinary
            // ------------------------------------------------
            let thumbnailUrl = '';

            if (
                thumbnailInput &&
                thumbnailInput.files &&
                thumbnailInput.files[0]
            ) {
                const thumbnailFile = thumbnailInput.files[0];

                const maxThumbSize = 3 * 1024 * 1024;

                if (thumbnailFile.size > maxThumbSize) {
                    throw new Error(
                        'Thumbnail must be 3MB or smaller.'
                    );
                }

                if (
                    ![
                        'image/jpeg',
                        'image/png',
                        'image/webp'
                    ].includes(thumbnailFile.type)
                ) {
                    throw new Error(
                        'Thumbnail must be JPG, PNG, or WEBP.'
                    );
                }

                submitBtn.innerHTML = 'Uploading thumbnail...';

                const thumbSignatureResponse = await fetch(
                    '/api/cloudinary/upload-signature',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-Token': csrfToken
                        },
                        body: JSON.stringify({
                            resourceType: 'image'
                        })
                    }
                );

                const thumbSignatureData =
                    await thumbSignatureResponse.json();

                if (!thumbSignatureResponse.ok) {
                    throw new Error(
                        thumbSignatureData.error ||
                        'Could not prepare thumbnail upload.'
                    );
                }

                const thumbFormData = new FormData();

                thumbFormData.append(
                    'file',
                    thumbnailFile
                );

                thumbFormData.append(
                    'api_key',
                    thumbSignatureData.apiKey
                );

                thumbFormData.append(
                    'timestamp',
                    thumbSignatureData.timestamp
                );

                thumbFormData.append(
                    'signature',
                    thumbSignatureData.signature
                );

                thumbFormData.append(
                    'folder',
                    thumbSignatureData.folder
                );

                const cloudinaryThumbUrl =
                    `https://api.cloudinary.com/v1_1/${encodeURIComponent(
                        thumbSignatureData.cloudName
                    )}/image/upload`;

                const thumbResponse = await fetch(
                    cloudinaryThumbUrl,
                    {
                        method: 'POST',
                        body: thumbFormData
                    }
                );

                const thumbResult =
                    await thumbResponse.json();

                if (
                    !thumbResponse.ok ||
                    !thumbResult.secure_url
                ) {
                    console.error(
                        'Cloudinary thumbnail error:',
                        thumbResult
                    );

                    throw new Error(
                        thumbResult.error?.message ||
                        'Thumbnail upload failed.'
                    );
                }

                thumbnailUrl = thumbResult.secure_url;
            }

            // ------------------------------------------------
            // Send ONLY text data + Cloudinary URLs to Vercel
            // ------------------------------------------------
            submitBtn.innerHTML = 'Saving note...';

            const formData = new FormData(uploadForm);

            // Remove actual files.
            // The PDF/thumbnail are already on Cloudinary.
            formData.delete('pdf');
            formData.delete('thumbnail');

            formData.append(
                'pdf_path',
                pdfResult.secure_url
            );

            formData.append(
                'thumbnail',
                thumbnailUrl
            );

            const saveResponse = await fetch(
                '/upload',
                {
                    method: 'POST',
                    body: formData
                }
            );

            if (!saveResponse.ok) {
                const text = await saveResponse.text();

                console.error(
                    'Save note failed:',
                    saveResponse.status,
                    text
                );

                throw new Error(
                    'The file uploaded, but the note could not be saved.'
                );
            }

            // ------------------------------------------------
            // Follow server redirect
            // ------------------------------------------------
            window.location.href =
                saveResponse.url;

        } catch (error) {
            console.error('Upload error:', error);

            showToast(
                error.message ||
                'Upload failed. Please try again.',
                'error'
            );

            submitBtn.disabled = false;

            submitBtn.innerHTML = `
                <svg width="17" height="17" viewBox="0 0 24 24"
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
