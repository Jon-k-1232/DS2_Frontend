import React, { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Typography, Stack } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

const formatBytes = bytes => {
   if (!bytes && bytes !== 0) return '';
   if (bytes < 1024) return `${bytes} B`;
   if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
   return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const defaultAcceptedText = acceptExtensions =>
   acceptExtensions && acceptExtensions.length ? acceptExtensions.join(', ') : 'Any';

const normalizeExtensions = extensions =>
   (extensions || []).map(ext => ext.trim().toLowerCase()).filter(Boolean);

const FileDropzone = ({
   acceptExtensions,
   maxSizeBytes,
   onFileSelected,
   onError,
   helperText,
   label,
   selectedFile,
   onClear,
   disabled
}) => {
   const [isDragging, setIsDragging] = useState(false);
   const dragCounterRef = useRef(0);
   const inputRef = useRef(null);

   const normalizedExtensions = useMemo(() => normalizeExtensions(acceptExtensions), [acceptExtensions]);

   const resetDragState = useCallback(() => {
      dragCounterRef.current = 0;
      setIsDragging(false);
   }, []);

   const emitError = useCallback(
      message => {
         if (onError) onError(message);
      },
      [onError]
   );

   const validateFile = useCallback(
      file => {
         if (!file) {
            emitError('No file detected.');
            return null;
         }

         if (normalizedExtensions.length) {
            const lowerName = file.name.toLowerCase();
            const matchesExtension = normalizedExtensions.some(ext => lowerName.endsWith(ext));
            if (!matchesExtension) {
               emitError(`Unsupported file type. Allowed: ${normalizedExtensions.join(', ')}`);
               return null;
            }
         }

         if (maxSizeBytes && file.size > maxSizeBytes) {
            emitError(`File must be ${(maxSizeBytes / (1024 * 1024)).toFixed(1)}MB or smaller.`);
            return null;
         }

         return file;
      },
      [emitError, maxSizeBytes, normalizedExtensions]
   );

   const handleFile = useCallback(
      file => {
         const validFile = validateFile(file);
         if (validFile) {
            if (onFileSelected) {
               onFileSelected(validFile);
            }
         }
      },
      [onFileSelected, validateFile]
   );

   const handleDragEnter = useCallback(
      event => {
         event.preventDefault();
         event.stopPropagation();
         if (disabled) return;
         dragCounterRef.current += 1;
         if (!isDragging) setIsDragging(true);
      },
      [disabled, isDragging]
   );

   const handleDragOver = useCallback(
      event => {
         event.preventDefault();
         event.stopPropagation();
         if (disabled) return;
         if (!isDragging) setIsDragging(true);
      },
      [disabled, isDragging]
   );

   const handleDragLeave = useCallback(event => {
      event.preventDefault();
      event.stopPropagation();
      if (disabled) return;

      const { relatedTarget, currentTarget } = event;
      if (relatedTarget && currentTarget.contains(relatedTarget)) {
         return;
      }

      dragCounterRef.current = Math.max(dragCounterRef.current - 1, 0);
      if (dragCounterRef.current === 0) {
         setIsDragging(false);
      }
   }, [disabled]);

   const handleDrop = useCallback(
      event => {
         event.preventDefault();
         event.stopPropagation();
         if (disabled) return;

         resetDragState();

         const files = event.dataTransfer?.files;
         if (!files || files.length === 0) {
            emitError('No file detected.');
            return;
         }

         if (files.length > 1) {
            emitError('Please upload only one file at a time.');
            return;
         }

         handleFile(files[0]);
      },
      [disabled, emitError, handleFile, resetDragState]
   );

   const handleInputChange = event => {
      const file = event.target.files?.[0] || null;
      if (!file) return;
      handleFile(file);
      event.target.value = null;
   };

   const handleBrowseClick = () => {
      if (disabled) return;
      inputRef.current?.click();
   };

   // When a file is selected, the dropzone itself becomes a clear
   // confirmation panel (green, checkmark, filename). This keeps the
   // "a file is ready" signal in the same prominent spot the user just
   // dropped into — no scrolling down to a separate row to confirm.
   if (selectedFile) {
      return (
         <Box
            sx={{
               border: '2px solid',
               borderColor: 'success.main',
               borderRadius: 2,
               p: 4,
               textAlign: 'center',
               backgroundColor: 'rgba(46, 125, 50, 0.08)'
            }}
         >
            <CheckCircleIcon color='success' sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant='subtitle1' sx={{ fontWeight: 700, mb: 0.5 }}>
               File ready to upload
            </Typography>
            <Stack direction='row' spacing={1} alignItems='center' justifyContent='center' sx={{ mb: 2 }}>
               <InsertDriveFileIcon fontSize='small' color='action' />
               <Typography variant='body1'>{selectedFile.name}</Typography>
               {selectedFile.size != null && (
                  <Typography variant='body2' color='text.secondary'>
                     ({formatBytes(selectedFile.size)})
                  </Typography>
               )}
            </Stack>
            <Stack direction='row' spacing={1} justifyContent='center'>
               <Button variant='outlined' size='small' onClick={handleBrowseClick} disabled={disabled}>
                  Choose a different file
               </Button>
               {onClear && (
                  <Button color='error' variant='text' size='small' onClick={onClear} disabled={disabled}>
                     Clear
                  </Button>
               )}
            </Stack>
            <input
               ref={inputRef}
               type='file'
               style={{ display: 'none' }}
               onChange={handleInputChange}
               disabled={disabled}
               accept={normalizedExtensions.map(ext => `*${ext}`).join(',')}
            />
         </Box>
      );
   }

   return (
      <Box>
         <Box
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDragEnd={resetDragState}
            onDrop={handleDrop}
            sx={{
               border: '2px dashed',
               borderColor: disabled ? 'grey.400' : isDragging ? 'primary.main' : 'grey.500',
               borderRadius: 2,
               p: 6,
               textAlign: 'center',
               backgroundColor: disabled ? 'action.disabledBackground' : isDragging ? 'action.hover' : 'background.default',
               transition: theme => theme.transitions.create(['border-color', 'background-color'], {
                  duration: theme.transitions.duration.shortest
               }),
               cursor: disabled ? 'not-allowed' : 'pointer'
            }}
         >
            <CloudUploadIcon color={isDragging ? 'primary' : 'disabled'} sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant='subtitle1' sx={{ mb: 1 }}>
               {label || 'Drag and drop files here'}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
               {helperText || `Accepted formats: ${defaultAcceptedText(normalizedExtensions)}`}
            </Typography>
            <Button variant='outlined' sx={{ mt: 3 }} onClick={handleBrowseClick} disabled={disabled}>
               Browse Files
            </Button>
            <input
               ref={inputRef}
               type='file'
               style={{ display: 'none' }}
               onChange={handleInputChange}
               disabled={disabled}
               accept={normalizedExtensions.map(ext => `*${ext}`).join(',')}
            />
         </Box>
      </Box>
   );
};

FileDropzone.propTypes = {
   acceptExtensions: PropTypes.arrayOf(PropTypes.string),
   maxSizeBytes: PropTypes.number,
   onFileSelected: PropTypes.func.isRequired,
   onError: PropTypes.func,
   helperText: PropTypes.string,
   label: PropTypes.string,
   selectedFile: PropTypes.object,
   onClear: PropTypes.func,
   disabled: PropTypes.bool
};

export default FileDropzone;
