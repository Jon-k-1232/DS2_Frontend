import React, { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

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

         {selectedFile && (
            <Box
               sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'action.hover',
                  borderRadius: 1,
                  p: 2,
                  mt: 2
               }}
            >
               <Typography variant='body2'>{selectedFile.name}</Typography>
               {onClear && (
                  <Button color='inherit' onClick={onClear} disabled={disabled}>
                     Clear
                  </Button>
               )}
            </Box>
         )}
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
