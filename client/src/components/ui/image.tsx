import { forwardRef } from "react";

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

const Image = forwardRef<HTMLImageElement, ImageProps>(
  ({ className, alt, ...props }, ref) => {
    return (
      <img
        ref={ref}
        alt={alt}
        className={className}
        {...props}
      />
    );
  }
);

Image.displayName = "Image";

export { Image };
export default Image;
