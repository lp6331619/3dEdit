import axiosInstance from "./axios";

export const ContentType = {
  Json: "application/json",
  FormData: "multipart/form-data",
  UrlEncoded: "application/x-www-form-urlencoded",
  Text: "text/plain",
};

export function request(options) {
  if (options.type) {
    options.headers = {
      "Content-Type": options.type || ContentType.Json,
      ...options.headers,
    };
  }
  return axiosInstance.request(options);
}
