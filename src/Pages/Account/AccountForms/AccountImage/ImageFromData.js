const ImageFromData = ({ accountInformation }) => {
   const { data } = accountInformation?.account_logo_buffer || {};

   // Convert the data array to a Base64 string
   const base64String = data && btoa(data.reduce((acc, byte) => acc + String.fromCharCode(byte), ''));

   return <img style={{ width: '10em' }} src={base64String ? `data:image/png;base64,${base64String}` : null} alt='Company Logo' />;
};

export default ImageFromData;
