import { useMemo } from 'react';

const toBase64FromArray = dataArray => {
   if (!Array.isArray(dataArray) || dataArray.length === 0) {
      return null;
   }

   return window.btoa(String.fromCharCode.apply(null, dataArray));
};

const ImageFromData = ({ accountInformation }) => {
   const fallbackBase64 = useMemo(() => toBase64FromArray(accountInformation?.account_logo_buffer?.data), [accountInformation]);

   const base64String = accountInformation?.account_logo_base64 || fallbackBase64;
   const contentType = accountInformation?.account_logo_content_type || 'image/png';
   const imageSrc = base64String ? `data:${contentType};base64,${base64String}` : null;

   return <img style={{ width: '10em' }} src={imageSrc} alt='Company Logo' />;
};

export default ImageFromData;
