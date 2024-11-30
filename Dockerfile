FROM node:latest
RUN mkdir -p /apps
COPY ./ /apps
WORKDIR /apps
RUN node -i 
CMD [ "aem up" ]