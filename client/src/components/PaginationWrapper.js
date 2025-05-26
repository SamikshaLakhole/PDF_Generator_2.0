import React from "react";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";

const PaginationWrapper = ({ currentPage, pageCount, onPageChange }) => {
  return (
    <div className={"flex justify-center mt-4 pb-6 "}>
      <Stack spacing={2}>
        <Pagination
          count={pageCount}
          page={currentPage}
          onChange={onPageChange}
          shape="rounded"
          color="primary"
          size="medium"
        />
      </Stack>
    </div>
  );
};

export default PaginationWrapper;
