# NewPipe Extractor bundles Rhino, which references java.beans classes Android does not ship; R8 fails the release build without this.
-dontwarn java.beans.**
