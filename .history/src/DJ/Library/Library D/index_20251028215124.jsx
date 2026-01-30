// Library D - Just imports and re-exports Library B with deck='D'
import LibraryB from '../Library B';

const LibraryD = (props) => {
  return <LibraryB {...props} deck="D" />;
};

export default LibraryD;
