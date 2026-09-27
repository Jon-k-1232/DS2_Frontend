import PropTypes from "prop-types";
import { Helmet } from "react-helmet-async";
import { forwardRef } from "react";
import { Box } from "@mui/material";

const Page = forwardRef(({ children, title = "", ...other }, ref) => (
  <Box ref={ref} {...other}>
    {title && <Helmet><title>{title} | DS2</title></Helmet>}
    {children}
  </Box>
));

Page.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
};

export default Page;
