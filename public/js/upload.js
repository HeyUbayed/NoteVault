document.addEventListener('DOMContentLoaded', () => {
    setupFileDrop('pdfDrop', 'pdf', (file) => file.type === 'application/pdf', 'pdfDropLabel');
    setupFileDrop('thumbDrop', 'thumbnail', (file) => file.type.startsWith('image/'), 'thumbDropLabel');

    function setupFileDrop(dropId, inputName, validator, labelId) {
        const drop = document.getElementById(dropId);
        if (!drop) return;
        const input = drop.querySelector(`input[name="${inputName}"]`);
        const label = document.getElementById(labelId);

        ['dragenter', 'dragover'].forEach(evt => {
            drop.addEventListener(evt, (e) => { e.preventDefault(); drop.classList.add('dragover'); });
        });
        ['dragleave', 'drop'].forEach(evt => {
            drop.addEventListener(evt, (e) => { e.preventDefault(); drop.classList.remove('dragover'); });
        });
        drop.addEventListener('drop', (e) => {
            const file = e.dataTransfer.files[0];
            if (file && validator(file)) {
                input.files = e.dataTransfer.files;
                updateLabel(file);
            } else if (file) {
                showToast('Invalid file type for this field.', 'error');
            }
        });
        input.addEventListener('change', () => {
            if (input.files[0]) updateLabel(input.files[0]);
        });

        function updateLabel(file) {
            if (label) label.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
        }
    }

    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', (e) => {
            const pdfInput = uploadForm.querySelector('input[name="pdf"]');
            if (!pdfInput.files[0]) {
                e.preventDefault();
                showToast('Please select a PDF file to upload.', 'error');
                return;
            }
            const submitBtn = uploadForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Uploading...';
        });
    }
});
