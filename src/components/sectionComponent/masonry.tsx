import { Masonry, MasonryItem, Placeholder } from "@canva/app-ui-kit";

export default function MasonryList() {
  return (
    <Masonry targetRowHeightPx={100}>
      <MasonryItem targetHeightPx={100} targetWidthPx={180}>
        <Placeholder shape="rectangle" />
      </MasonryItem>
      <MasonryItem targetHeightPx={100} targetWidthPx={131}>
        <Placeholder shape="rectangle" />
      </MasonryItem>
      <MasonryItem targetHeightPx={100} targetWidthPx={182}>
        <Placeholder shape="rectangle" />
      </MasonryItem>
      <MasonryItem targetHeightPx={100} targetWidthPx={146}>
        <Placeholder shape="rectangle" />
      </MasonryItem>
      <MasonryItem targetHeightPx={100} targetWidthPx={191}>
        <Placeholder shape="rectangle" />
      </MasonryItem>
      <MasonryItem targetHeightPx={100} targetWidthPx={72}>
        <Placeholder shape="rectangle" />
      </MasonryItem>
      <MasonryItem targetHeightPx={100} targetWidthPx={184}>
        <Placeholder shape="rectangle" />
      </MasonryItem>
      <MasonryItem targetHeightPx={100} targetWidthPx={183}>
        <Placeholder shape="rectangle" />
      </MasonryItem>
    </Masonry>
  );
}
