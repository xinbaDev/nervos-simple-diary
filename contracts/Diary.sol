pragma solidity >=0.8.0;

contract Diary {

  address private _owner;

  struct Record {
      string content;
      uint256 timestamp;
  }

  uint32 recordNum;

  mapping (uint32 => Record) public diaries;

  // use for encrypt/decrypt diary, only contract owner can access
  string private dPubKey;
  string private dPrivKey;

  constructor(string memory _dPubKey, string memory _dPrivKey) payable {
    _owner = msg.sender;
    dPubKey = _dPubKey;
    dPrivKey = _dPrivKey;
    recordNum = 0;
  }

  modifier onlyOwner() {
      require(isOwner());
      _;
  }

  function isOwner() public view returns (bool) {
      return msg.sender == _owner;
  }

  function getdPubKey() public view onlyOwner returns (string memory) {
    return dPubKey;
  }

  function getdPrivKey() public view onlyOwner returns (string memory) {
    return dPrivKey;
  }

  function setNewRecord(string memory _content) public payable onlyOwner {
    diaries[recordNum] = Record({
            content: _content,
            timestamp: block.timestamp
        });
    recordNum += 1;
  }

  function setExistingRecord(uint32 recordNum, string memory _content) public payable onlyOwner {
      diaries[recordNum] = Record({
              content: _content,
              timestamp: block.timestamp
          });
  }

  function get(uint32 number) public view onlyOwner returns (Record memory) {
    if (number < 0 || number > recordNum) return Record({content:"", timestamp: 0});

    return diaries[number];
  }

  function getLatestDiaryNumber() public view onlyOwner returns (uint32) {
    return recordNum;
  }
}